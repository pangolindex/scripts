// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);


// Change These Variables
// --------------------------------------------------
const IDs = createArrayOfNumbers(265, 266); // Note: Range is inclusive
const includeExtraGas = true;
// --------------------------------------------------


/*
 * This is an example of confirming a set of multisig transactions
 */
(async () => {
    const multiContract = new web3.eth.Contract(ABI.GNOSIS_MULTISIG, ADDRESS.PANGOLIN_MULTISIG_ADDRESS);
    let nonce = parseInt(await web3.eth.getTransactionCount(CONFIG.WALLET.ADDRESS, 'pending'));

    for (const id of IDs) {

        const tx = multiContract.methods.confirmTransaction(id);

        const gas = await tx.estimateGas({ from: CONFIG.WALLET.ADDRESS });

        console.log(`Confirming transaction #${id} ...`);

        const receipt = await tx.send({
            from: CONFIG.WALLET.ADDRESS,
            gas: includeExtraGas ? 7500000 : gas,
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
  .finally(process.exit);

function createArrayOfNumbers(a, b) {
    const arr = [];
    for (let i = a; i <= b; i++) arr.push(i);
    return arr;
}
