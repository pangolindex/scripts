const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://songbird-api.flare.network/ext/C/rpc'));


// Change These Variables
// ---------------------------------------------------------------
const factoryAddress = ADDRESS.SONGBIRD_FACTORY;
// ---------------------------------------------------------------


/*
 * Lists all pools for a UniswapV2-based DEX.
 */
(async () => {
    const factoryContract = new web3.eth.Contract(ABI.FACTORY, factoryAddress);

    const poolCount = await factoryContract.methods.allPairsLength().call();
    console.log(`Pool Count: ${poolCount}`);

    const feeToSetter = await factoryContract.methods.feeToSetter().call();
    console.log(`feeToSetter: ${feeToSetter}`);

    const feeTo = await factoryContract.methods.feeTo().call();
    console.log(`feeTo: ${feeTo}`);
})();
