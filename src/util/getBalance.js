const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://songbird-api.flare.network/ext/C/rpc'));
// const web3 = new Web3(new Web3.providers.HttpProvider('https://flare-api.flare.network/ext/C/rpc'));
// const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));


// Change These Variables
// ---------------------------------------------------------------
const blockNumber = 'latest';
const tokenAddress = ADDRESS.PSB;
const ownerAddress = ADDRESS.SONGBIRD_GNOSIS_MULTISIG_ADDRESS;
// ---------------------------------------------------------------


(async () => {
    const gasBalance = await new web3.eth.getBalance(ownerAddress, blockNumber);
    console.log(`Gas balance at block ${blockNumber}: ${gasBalance}`);

    const tokenContract = new web3.eth.Contract(ABI.TOKEN, tokenAddress.toLowerCase());
    const tokenSymbol = await tokenContract.methods.symbol().call();
    const tx = tokenContract.methods.balanceOf(ownerAddress.toLowerCase());
    const tokenBalance = await tx.call(
        {}, // options
        blockNumber,
    );
    console.log(`${tokenSymbol} balance at block ${blockNumber}: ${tokenBalance}`);
})();
