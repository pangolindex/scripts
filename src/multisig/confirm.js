// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ADDRESS = require('../../config/address.json');
const CONSTANTS = require('../core/constants');
const { confirm: gnosisMultisigConfirm } = require('../core/gnosisMultisig');
const { confirm: gnosisSafeConfirm } = require('../core/gnosisSafe');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));
let gasSpent = web3.utils.toBN(0);


// Change These Variables
// --------------------------------------------------
// Note: Gnosis Safe: IDs will be transaction hashes
const IDs = [
    '0xce926df4c5622dbb4beaaefb47dd82c659e241dbc11f1bf5c2f2f754204571ee',
];
// Note: Gnosis Multisig: IDs will be transaction ids
// const IDs = createArrayOfNumbers(1, 1); // Note: Range is inclusive
const includeExtraGas = true;

const multisigAddress = ADDRESS.PANGOLIN_GNOSIS_SAFE_ADDRESS;
const multisigType = CONSTANTS.GNOSIS_SAFE;
// --------------------------------------------------


/*
 * This is an example of confirming a set of multisig transactions
 */
(async () => {
    let nonce = parseInt(await web3.eth.getTransactionCount(CONFIG.WALLET.ADDRESS, 'pending'));

    for (const id of IDs) {
        switch (multisigType) {
            case CONSTANTS.GNOSIS_MULTISIG:
                const receipt = await gnosisMultisigConfirm({
                    multisigAddress,
                    id,
                    includeExtraGas,
                    nonce,
                });

                if (!receipt) continue;
                nonce++;

                gasSpent.iadd(web3.utils.toBN(receipt.effectiveGasPrice).mul(web3.utils.toBN(receipt.gasUsed)));

                if (!receipt?.status) {
                    console.log(receipt);
                    process.exit(1);
                } else {
                    console.log(`Transaction hash: ${receipt.transactionHash}`);
                }

                break;
            case CONSTANTS.GNOSIS_SAFE:
                await gnosisSafeConfirm({
                    multisigAddress,
                    safeTxHash: id,
                });
                break;
            default:
                throw new Error(`Unknown multisig type: ${multisigType}`);
        }
    }
})()
    .catch(console.error)
    .finally(async () => {
        console.log(`Gas spent: ${gasSpent / (10 ** 18)}`);
        process.exit(0);
    });

function createArrayOfNumbers(a, b) {
    const arr = [];
    for (let i = a; i <= b; i++) arr.push(i);
    return arr;
}
