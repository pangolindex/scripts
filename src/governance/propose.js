// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ADDRESS = require('../../config/address.json');
const CONSTANTS = require('../core/constants');
const GovernorAlpha = require('@pangolindex/exchange-contracts/artifacts/contracts/governance/GovernorAlpha.sol/GovernorAlpha.json');
const { propose: gnosisMultisigPropose } = require('../core/gnosisMultisig');
const { propose: gnosisSafePropose } = require('../core/gnosisSafe');
const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
let gasSpent = web3.utils.toBN(0);

// Change These Variables
// --------------------------------------------------
const governorAlphaAddress = ADDRESS.PANGOLIN_GOVERNANCE_ADDRESS;
const multisigAddress = ADDRESS.PANGOLIN_GNOSIS_SAFE_ADDRESS;
const multisigType = CONSTANTS.GNOSIS_SAFE;
// --------------------------------------------------


(async () => {
    const governorAlphaContract = new web3.eth.Contract(GovernorAlpha.abi, governorAlphaAddress.toLowerCase());

    const VALUE = 0;
    const SIGNATURE1 = 'setFeeTo(address)';
    const SIGNATURE2 = 'setTreasuryFee(uint256)';

    const DATA1 = web3.eth.abi.encodeParameters(
        ['address'],
        [ADDRESS.FEE_COLLECTOR]
    );

    const DATA2 = web3.eth.abi.encodeParameters(
        ['uint256'],
        ['1500']
    );

    const tx = await governorAlphaContract.methods.propose(
        [ADDRESS.PANGOLIN_FACTORY, ADDRESS.FEE_COLLECTOR],
        [VALUE, VALUE],
        [SIGNATURE1, SIGNATURE2],
        [DATA1, DATA2],
`# Distributed PNG Buybacks

TLDR: Allow permissionless PNG buybacks to fund PNG staking

## What is the goal?
The PNG single side staking program is funded by the protocol's share of swap fees. This proposal will allow any user to 
permissionlessly initiate a buyback of PNG with these accumulated funds to continually fund the PNG staking program.

## What new functionality will this add?
Currently, every 14 days the multisig manually initiates a PNG buyback using the protocol's share of swap fees to refund 
the PNG staking program. This proposal will allow anybody to perform this task and will provide a small incentive 
depending on the buyback that needed to be done. This change also introduces two new functionalities:

1) Allow a small portion of emissions to be diverted into the PNG staking program should the community wish for this.

2) Allow a small portion of buybacks to be diverted to the Pangolin treasury. This is set to 15% and can only 
be changed by an on-chain Governance proposal.

## What would changing?
This proposal will change where swap fees are sent and stored from the pangolin multisig wallet to an audited contract. 
This contract (FeeCollector) has the logic to ensure buybacks can safely and permissionlessly be performed to maintain 
the single side PNG staking program.

## Technical Proposal
We will change the feeTo address of the Pangolin protocol to the FeeCollector contract.`
    );

    await tx.estimateGas({
        from: multisigAddress,
        gas: 8000000,
    });

    console.log(`Encoding bytecode ...`);
    const bytecode = tx.encodeABI();
    const fileName = path.basename(__filename, '.js');
    const fileOutput = path.join(__dirname, `${fileName}-bytecode.txt`);
    fs.writeFileSync(fileOutput, bytecode);
    console.log(`Encoded bytecode to ${fileOutput}`);
    console.log();

    switch (multisigType) {
        case CONSTANTS.GNOSIS_MULTISIG:
            const receipt = await gnosisMultisigPropose({
                multisigAddress,
                destination: governorAlphaAddress,
                value: 0,
                bytecode,
            });

            gasSpent.iadd(web3.utils.toBN(receipt.effectiveGasPrice).mul(web3.utils.toBN(receipt.gasUsed)));

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
                destination: governorAlphaAddress,
                value: 0,
                bytecode,
            });
            break;
        default:
            throw new Error(`Unknown multisig type: ${multisigType}`);
    }
})()
    .catch(console.error)
    .finally(async () => {
        console.log(`Gas spent: ${gasSpent / (10 ** 18)}`);
        process.exit(0);
    });
