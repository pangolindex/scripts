const CONFIG = require("../../config/config");
const ABI = require("../../config/abi.json");
const ADDRESS = require("../../config/address.json");
const CONSTANTS = require("../core/constants");
const path = require("node:path");
const fs = require("node:fs");
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));
const { propose: gnosisMultisigPropose } = require("../core/gnosisMultisig");
const { propose: gnosisSafePropose } = require("../core/gnosisSafe");
let gasSpent = web3.utils.toBN(0);
const Conversion = require("../core/conversion");

// Change These Variables
// --------------------------------------------------
const pangochefAddress = ADDRESS.SONGBIRD_PANGO_CHEF;
const pid = 18;
const pglAmount = Conversion.convertFloatToString(953030.184, 18);
const multisigAddress = ADDRESS.FLARE_GNOSIS_MULTISIG_ADDRESS;
const multisigType = CONSTANTS.GNOSIS_MULTISIG;
const bytecodeOnly = true;
// --------------------------------------------------

(async () => {
  let nonce = await web3.eth.getTransactionCount(
    CONFIG.WALLET.ADDRESS,
    "pending"
  );

  const pangochef = new web3.eth.Contract(ABI.PANGO_CHEF, pangochefAddress);
  const tx = pangochef.methods.stake(pid, pglAmount);

  console.log(`Encoding bytecode ...`);
  const bytecode = tx.encodeABI();
  const fileName = path.basename(__filename, ".js");
  const fileOutput = path.join(__dirname, `${fileName}-bytecode.txt`);
  fs.writeFileSync(fileOutput, bytecode);
  console.log(`Encoded bytecode to ${fileOutput}`);
  console.log();

  // Execution Check
  await tx.estimateGas({
      from: multisigAddress,
  });

  if (bytecodeOnly) {
    console.log(`Skipping execution due to 'bytecodeOnly' config`);
    return;
  }

  console.log(`Proposing tx to stake liquidity in pangochef ...`);

  switch (multisigType) {
    case CONSTANTS.GNOSIS_MULTISIG:
      const receipt = await gnosisMultisigPropose({
        multisigAddress,
        destination: pangochefAddress,
        value: 0,
        bytecode,
        nonce,
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
        destination: pangochefAddress,
        value: 0,
        bytecode,
      });
      break;
    default:
      throw new Error(`Unknown multisig type: ${multisigType}`);
  }
})()
  .catch(console.error)
  .finally(() => {
    console.log(`Gas spent: ${gasSpent / 10 ** 18}`);
    process.exit(0);
  });
