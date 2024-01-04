const CONFIG = require("../../config/config");
const ABIS = require("../../config/abi.json");
const CONSTANTS = require("../core/constants");
const { propose: gnosisMultisigPropose } = require("../core/gnosisMultisig");
const { propose: gnosisSafePropose } = require("../core/gnosisSafe");
const { CHAINS, StakingType } = require("@pangolindex/sdk");
const fs = require('fs');
const path = require('path');
const Web3 = require("web3");

const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));
let gasSpent = web3.utils.toBN(0);

const multisigType = CONSTANTS.GNOSIS_MULTISIG; // CHANGE THIS TO GNOSIS_SAFE FOR AVALANCHE, REST IS GNOSIS_MULTISIG

function getSarAddress(chainId) {
  return CHAINS[chainId]?.contracts?.staking?.find(
    (c) => c.type === StakingType.SAR_POSITIONS && c.active
  )?.address;
}

async function main() {
  const chain = CHAINS[CONFIG.CHAINID];
  const sarAbi = ABIS.SAR_STAKING;
  const sarAddress = getSarAddress(CONFIG.CHAINID);
  const multisigAddress = "0x11bd0ce0b4f8497153b09f70CD6187012619328D";//chain.contracts?.local_multisig;
  const nftId = "1990";
  const amount = "9100000000000000000000000";

  const sarContract = new web3.eth.Contract(sarAbi, sarAddress);

  const tx = sarContract.methods.stake(nftId, amount);

  console.log(`Encoding bytecode ...`);
  const bytecode = tx.encodeABI();
  const fileName = path.basename(__filename, '.js');
  const fileOutput = path.join(__dirname, `${fileName}-bytecode.txt`);
  fs.writeFileSync(fileOutput, bytecode);
  console.log(`Encoded bytecode to ${fileOutput}`);
  console.log(bytecode);

  switch (multisigType) {
    case CONSTANTS.GNOSIS_MULTISIG:
      const receipt = await gnosisMultisigPropose({
        multisigAddress,
        destination: sarAddress,
        value: 0,
        bytecode,
      });

      gasSpent.iadd(
        web3.utils
          .toBN(receipt.effectiveGasPrice)
          .mul(web3.utils.toBN(receipt.gasUsed))
      );

      if (!receipt?.status) {
        console.log(receipt);
        process.exit(1);
      } else {
        console.log(`Transaction hash: ${receipt.transactionHash}`);
      }
      break;
    case CONSTANTS.GNOSIS_SAFE:
      await gnosisSafePropose({
        multisigAddress,
        destination: sarAddress,
        value: 0,
        bytecode,
      });
      break;
    default:
      throw new Error(`Unknown multisig type: ${multisigType}`);
  }
  console.log(`Gas spent: ${gasSpent / (10 ** 18)}`);
}

main();