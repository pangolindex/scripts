const ABI = require('../../config/abi.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));


// Change These Variables
// --------------------------------------------------
const tokenAddresses = [
    '0x0000000000000000000000000000000000000000',
];
// --------------------------------------------------


/*
 * Fetch and show token information like name, symbol, decimals, etc.
 */
(async () => {
    const table = [];

    for (const tokenAddress of tokenAddresses) {
        const tokenContract = new web3.eth.Contract(ABI.TOKEN, tokenAddress);
        const [ name, symbol, decimals, totalSupply ] = await Promise.all([
            tokenContract.methods.name().call(),
            tokenContract.methods.symbol().call(),
            tokenContract.methods.decimals().call(),
            tokenContract.methods.totalSupply().call()
        ])
        table.push({
            name,
            symbol,
            decimals,
            totalSupply: (totalSupply / (10 ** decimals)).toLocaleString(),
        });
    }

    console.table(table);
})();
