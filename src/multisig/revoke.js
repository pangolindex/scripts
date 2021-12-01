// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
let startingAvax;
let endingAvax;


// Change These Variables
// --------------------------------------------------
const IDs = createArrayOfNumbers(0, 0); // Note: Range is inclusive

const multisigAddress = ADDRESS.PANGOLIN_MULTISIG_ADDRESS;
// --------------------------------------------------


/*
 * This is an example of revoking confirmations on a set of multisig transactions
 */
(async () => {
    const multiContract = new web3.eth.Contract(ABI.GNOSIS_MULTISIG, multisigAddress);
    let nonce = parseInt(await web3.eth.getTransactionCount(CONFIG.WALLET.ADDRESS, 'pending'));

    startingAvax = await web3.eth.getBalance(CONFIG.WALLET.ADDRESS);
    console.log(`Starting AVAX: ${startingAvax / (10 ** 18)}`);

    for (const id of IDs) {

        const { destination, value, data, executed } = await multiContract.methods.transactions(id).call();
        if (executed) {
            console.log(`Skipping #${id} due to prior execution`);
            continue;
        }

        const alreadyConfirmed = await multiContract.methods.confirmations(id, CONFIG.WALLET.ADDRESS).call();
        if (!alreadyConfirmed) {
            console.log(`Skipping #${id} due to lack of prior confirmation`);
            continue;
        }

        const tx = multiContract.methods.revokeConfirmation(id);

        const gas = await tx.estimateGas({ from: CONFIG.WALLET.ADDRESS });

        console.log(`Revoking confirmation of transaction #${id} ...`);

        const receipt = await tx.send({
            from: CONFIG.WALLET.ADDRESS,
            gas: gas,
            gasPrice: await web3.eth.getGasPrice(),
            nonce: nonce++,
        });

        if (!receipt?.status) {
            console.log(receipt);
            process.exit(1);
        } else {
            console.log(`Transaction hash: ${receipt.transactionHash}`);
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
