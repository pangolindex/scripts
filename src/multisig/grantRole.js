// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');
const CONSTANTS = require('../core/constants');
const Helpers = require('../core/helpers');
const fs = require('node:fs');
const path = require('node:path');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
const { propose: gnosisMultisigPropose } = require('../core/gnosisMultisig');
const { propose: gnosisSafePropose } = require('../core/gnosisSafe');
let gasSpent = web3.utils.toBN(0);

// Change These Variables
// --------------------------------------------------
const contractAddress = ADDRESS.FLARE_PANGO_CHEF;
const granteeAddress = '0x0000000000000000000000000000000000000000';
const role = Helpers.keccak256('FUNDER_ROLE');
const multisigAddress = ADDRESS.FLARE_GNOSIS_MULTISIG_ADDRESS;
const multisigType = CONSTANTS.GNOSIS_MULTISIG;
const bytecodeOnly = false;
// --------------------------------------------------


/*
 * This is an example of granting a role from the multisig
 */
(async () => {
    const contract = new web3.eth.Contract(ABI.ACCESS_CONTROL, contractAddress.toLowerCase());

    const tx = contract.methods.grantRole(
        role,
        granteeAddress.toLowerCase(),
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
        console.log(`Skipping grantRole due to "bytecodeOnly" flag`);
        return;
    }

    switch (multisigType) {
        case CONSTANTS.GNOSIS_MULTISIG:
            const receipt = await gnosisMultisigPropose({
                multisigAddress,
                destination: contract._address,
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
                destination: contract._address,
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
        console.log(`Gas spent: ${gasSpent / (10 ** 18)}`);
        process.exit(0);
    });
