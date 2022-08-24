// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ADDRESS = require('../../config/address.json');
const CONSTANTS = require('../core/constants');
const { execute: gnosisMultisigExecute } = require('../core/gnosisMultisig');
const { execute: gnosisSafeExecute } = require('../core/gnosisSafe');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
let startingAvax;
let endingAvax;


// Change These Variables
// --------------------------------------------------
// Note: Gnosis Safe: IDs will be transaction hashes
const IDs = [
    '0xce926df4c5622dbb4beaaefb47dd82c659e241dbc11f1bf5c2f2f754204571ee',
];
// Note: Gnosis Multisig: IDs will be transaction ids
// const IDs = createArrayOfNumbers(1, 1); // Note: Range is inclusive

const multisigAddress = ADDRESS.PANGOLIN_GNOSIS_SAFE_ADDRESS;
const multisigType = CONSTANTS.GNOSIS_SAFE;
// --------------------------------------------------


/*
 * This is an example of executing a set of multisig transactions that have been sufficiently confirmed
 */
(async () => {
    startingAvax = await web3.eth.getBalance(CONFIG.WALLET.ADDRESS);

    for (const id of IDs) {
        let nonce = parseInt(await web3.eth.getTransactionCount(CONFIG.WALLET.ADDRESS, 'pending'));
        let receipt;

        switch (multisigType) {
            case CONSTANTS.GNOSIS_MULTISIG:
                receipt = await gnosisMultisigExecute({
                    multisigAddress,
                    id,
                    nonce,
                });

                if (!receipt) continue;

                if (!receipt?.status) {
                    console.log(receipt);
                    process.exit(1);
                } else {
                    nonce++;
                    console.log(`Transaction hash: ${receipt.transactionHash}`);
                }
                break;
            case CONSTANTS.GNOSIS_SAFE:
                receipt = await gnosisSafeExecute({
                    multisigAddress,
                    safeTxHash: id,
                });

                if (!receipt) continue;

                if (!receipt?.status) {
                    console.log(receipt);
                    process.exit(1);
                } else {
                    nonce++;
                    console.log(`Transaction hash: ${receipt.transactionHash}`);
                }
                break;
            default:
                throw new Error(`Unknown multisig type: ${multisigType}`);
        }
    }
})()
    .catch(console.error)
    .finally(async () => {
        endingAvax = await web3.eth.getBalance(CONFIG.WALLET.ADDRESS);
        console.log(`AVAX spent: ${(startingAvax - endingAvax) / (10 ** 18)}`);
        process.exit(0);
    });

function createArrayOfNumbers(a, b) {
    const arr = [];
    for (let i = a; i <= b; i++) arr.push(i);
    return arr;
}
