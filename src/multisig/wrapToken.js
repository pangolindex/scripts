const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');
const CONSTANTS = require('../core/constants');
const { propose: gnosisMultisigPropose } = require('../core/gnosisMultisig');
const { propose: gnosisSafePropose } = require('../core/gnosisSafe');
const fs = require('node:fs');
const path = require('node:path');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));
let gasSpent = web3.utils.toBN(0);

// Change These Variables
// --------------------------------------------------
const wnatAddress = ADDRESS.WFLR;
const amount = '250000' + '0'.repeat(18);
const multisigAddress = ADDRESS.FLARE_GNOSIS_MULTISIG_ADDRESS;
const multisigType = CONSTANTS.GNOSIS_MULTISIG;
const bytecodeOnly = false;
// --------------------------------------------------


(async () => {
    const wnatContract = new web3.eth.Contract(ABI.WFLR, wnatAddress);

    const tx = wnatContract.methods.deposit();

    console.log(`Encoding bytecode ...`);
    const bytecode = tx.encodeABI();
    const fileName = path.basename(__filename, '.js');
    const fileOutput = path.join(__dirname, `${fileName}-bytecode.txt`);
    fs.writeFileSync(fileOutput, bytecode);
    console.log(`Encoded bytecode to ${fileOutput}`);
    console.log();

    if (bytecodeOnly) {
        console.log(`Skipping execution due to 'bytecodeOnly' config`);
        return;
    }

    // Execution Check
    await tx.estimateGas({
        from: multisigAddress,
        value: amount,
    });

    console.log(`Proposing tx to wrap ...`);

    switch (multisigType) {
        case CONSTANTS.GNOSIS_MULTISIG:
            const receipt = await gnosisMultisigPropose({
                multisigAddress,
                destination: wnatContract._address,
                value: amount,
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
                destination: wnatContract._address,
                value: amount,
                bytecode,
            });
            break;
        default:
            throw new Error(`Unknown multisig type: ${multisigType}`);
    }
})()
    .catch(console.error)
    .finally(() => {
        console.log(`Gas spent: ${gasSpent / (10 ** 18)}`);
        process.exit(0);
    });
