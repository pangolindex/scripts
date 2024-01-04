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
const Conversion = require("../core/conversion");

// Change These Variables
// --------------------------------------------------
const routerAddress = ADDRESS.FLARE_ROUTER;
const tokenAddress = "0xFf1B852A0582BF87E69FaD114560595FC5cF1212";
const liquidity = Conversion.convertFloatToString(960023.547, 18);
const tokenAmountMin = "2475569270283039027456122";
const wnatAmountMin = "350384448849997350455588";
const multisigAddress = ADDRESS.FLARE_GNOSIS_MULTISIG_ADDRESS;
const multisigType = CONSTANTS.GNOSIS_MULTISIG;
const bytecodeOnly = false;
// --------------------------------------------------


(async () => {
    const router = new web3.eth.Contract(ABI.ROUTER, routerAddress);
    const tx = router.methods.removeLiquidityAVAX(
        tokenAddress,                 // token
        liquidity,                    // liquidity amount  
        tokenAmountMin,        // amountTokenMin
        wnatAmountMin,         // amountAVAXMin
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
    });

    if (bytecodeOnly) {
        console.log(`Skipping execution due to 'bytecodeOnly' config`);
        return;
    }

    console.log(`Proposing tx to removeLiquidityAVAX ...`);

    switch (multisigType) {
        case CONSTANTS.GNOSIS_MULTISIG:
            const receipt = await gnosisMultisigPropose({
                multisigAddress,
                destination: routerAddress,
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
                destination: routerAddress,
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