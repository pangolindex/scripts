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
// ZapperFi overview of swap fees available: https://zapper.fi/account/0xa622f4334b40d879dd2a5dccf9eeeb66f7592cd0/protocols/avalanche/pangolin
const pglAddresses = [
    '0x0000000000000000000000000000000000000000',
];
// --------------------------------------------------


(async () => {
    startingAvax = await web3.eth.getBalance(CONFIG.WALLET.ADDRESS);
    console.log(`Starting AVAX: ${startingAvax / (10 ** 18)}`);

    const feeCollectorContract = new web3.eth.Contract(ABI.FEE_COLLECTOR, ADDRESS.FEE_COLLECTOR);

    const tx = feeCollectorContract.methods.harvest(
        pglAddresses,
        false, // claimMiniChef
    );
    const gas = await tx.estimateGas({ from: CONFIG.WALLET.ADDRESS });
    const baseGasPrice = await web3.eth.getGasPrice();
    const expectedGasPrice = parseInt(baseGasPrice) + parseInt(web3.utils.toWei('2', 'nano'));

    console.log(`Estimated gas cost of ~${(gas * expectedGasPrice / (10 ** 18)).toLocaleString(undefined, {minimumFractionDigits: 3})} AVAX`);

    console.log('Sending harvest() ...');
    const receipt = await tx.send({
        from: CONFIG.WALLET.ADDRESS,
        gas,
        maxFeePerGas: baseGasPrice * 2,
        maxPriorityFeePerGas: web3.utils.toWei('2', 'nano'),
    });

    if (!receipt?.status) {
        console.log(receipt);
        process.exit(1);
    } else {
        console.log(`Transaction hash: ${snowtraceLink(receipt.transactionHash)}`);
    }
})()
  .catch(console.error)
  .finally(async () => {
      endingAvax = await web3.eth.getBalance(CONFIG.WALLET.ADDRESS);
      console.log(`Ending AVAX: ${endingAvax / (10 ** 18)}`);
      console.log(`AVAX spent: ${(startingAvax - endingAvax) / (10 ** 18)}`);
      process.exit(0);
  });

function snowtraceLink(hash) {
    return `https://snowtrace.io/tx/${hash}`;
}
