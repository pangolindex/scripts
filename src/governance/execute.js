// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);


// Change These Variables
// --------------------------------------------------
const govAddress = ADDRESS.PANGOLIN_GOVERNANCE_ADDRESS;
const proposal = 5;
// --------------------------------------------------


(async () => {
    const govContract = new web3.eth.Contract(ABI.GOVERNOR_ALPHA, govAddress);

    const tx = govContract.methods.execute(proposal);

    const baseGasPrice = await web3.eth.getGasPrice();

    return tx.send({
        from: CONFIG.WALLET.ADDRESS,
        gas: '8000000',
        maxFeePerGas: baseGasPrice * 2,
        maxPriorityFeePerGas: web3.utils.toWei('2', 'nano'),
    });
})()
    .then(console.log)
    .catch(console.error)
    .finally(process.exit);
