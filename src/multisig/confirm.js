// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ADDRESS = require('../../config/address.json');
const CONSTANTS = require('../core/constants');
const { confirm: gnosisMultisigConfirm } = require('../core/gnosisMultisig');
const { confirm: gnosisSafeConfirm } = require('../core/gnosisSafe');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
let startingAvax;
let endingAvax;


// Change These Variables
// --------------------------------------------------
// Note: when using a gnosis multisig, these will be IDs vs. hashes when using a gnosis safe
const IDs = createArrayOfNumbers(13, 13); // Note: Range is inclusive
const includeExtraGas = true;

const multisigAddress = ADDRESS.PANGOLIN_MULTISIG_ADDRESS;
const multisigType = CONSTANTS.GNOSIS_MULTISIG;
// --------------------------------------------------


/*
 * This is an example of confirming a set of multisig transactions
 */
(async () => {
    startingAvax = await web3.eth.getBalance(CONFIG.WALLET.ADDRESS);
    console.log(`Starting AVAX: ${startingAvax / (10 ** 18)}`);

    for (const id of IDs) {
        let nonce = parseInt(await web3.eth.getTransactionCount(CONFIG.WALLET.ADDRESS, 'pending'));

        switch (multisigType) {
            case CONSTANTS.GNOSIS_MULTISIG:
                const receipt = await gnosisMultisigConfirm({
                    multisigAddress,
                    id,
                    includeExtraGas,
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
        endingAvax = await web3.eth.getBalance(CONFIG.WALLET.ADDRESS);
        console.log(`Ending AVAX: ${endingAvax / (10 ** 18)}`);
        console.log(`AVAX spent: ${(startingAvax - endingAvax) / (10 ** 18)}`);
        process.exit(0);
    });

function createArrayOfNumbers(a, b) {
    const arr = [];
    for (let i = a; i <= b; i++) arr.push(i);
    return arr;
}
