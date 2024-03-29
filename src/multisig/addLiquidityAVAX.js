const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');
const CONSTANTS = require('../core/constants');
const path = require('node:path');
const fs = require('node:fs');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));
const {propose: gnosisMultisigPropose} = require('../core/gnosisMultisig');
const {propose: gnosisSafePropose} = require('../core/gnosisSafe');
let gasSpent = web3.utils.toBN(0);

// Change These Variables
// --------------------------------------------------
const routerAddress = ADDRESS.FLARE_ROUTER;
const tokenAddress = ADDRESS.PFL;
const tokenAmount = '8625000' + '0'.repeat(18);
const tokenAmountMin = '8625000' + '0'.repeat(18);
const wnatAmount = '1950000' + '0'.repeat(18);
const wnatAmountMin = '1950000' + '0'.repeat(18);
const multisigAddress = ADDRESS.FLARE_GNOSIS_MULTISIG_ADDRESS;
const multisigType = CONSTANTS.GNOSIS_MULTISIG;
const bytecodeOnly = false;
// --------------------------------------------------


(async () => {
    const router = new web3.eth.Contract(ABI.ROUTER, routerAddress);
    const tx = router.methods.addLiquidityAVAX(
        tokenAddress,                 // token
        tokenAmount,                  // amountTokenDesired
        tokenAmountMin ?? '0',        // amountTokenMin
        wnatAmountMin ?? '0',         // amountAVAXMin
        multisigAddress,
        Math.ceil(Date.now() / 1000) + (86400),
    );

    console.log(`Encoding bytecode ...`);
    const bytecode = tx.encodeABI();
    const fileName = path.basename(__filename, '.js');
    const fileOutput = path.join(__dirname, `${fileName}-bytecode.txt`);
    fs.writeFileSync(fileOutput, bytecode);
    console.log(`Encoded bytecode to ${fileOutput}`);
    console.log();

    // Execution Check
    await tx.estimateGas({
        from: multisigAddress,
        value: wnatAmount,
    });

    if (bytecodeOnly) {
        console.log(`Skipping execution due to 'bytecodeOnly' config`);
        return;
    }

    console.log(`Proposing tx to addLiquidityAVAX ...`);

    switch (multisigType) {
        case CONSTANTS.GNOSIS_MULTISIG:
            const receipt = await gnosisMultisigPropose({
                multisigAddress,
                destination: router._address,
                value: wnatAmount,
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
                destination: router._address,
                value: wnatAmount,
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