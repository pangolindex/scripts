// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);


// Change These Variables
// --------------------------------------------------
const ID = 5;
// --------------------------------------------------


(async () => {
    const gov = new web3.eth.Contract(ABI.GOVERNOR_ALPHA, ADDRESS.PANGOLIN_GOVERNANCE_ADDRESS);

    const tx = gov.methods.execute(ID);

    return tx.send({
        from: CONFIG.WALLET.ADDRESS,
        gas: '8000000',
        gasPrice: await web3.eth.getGasPrice(),
    });
})()
    .then(console.log)
    .catch(console.error)
    .finally(process.exit);
