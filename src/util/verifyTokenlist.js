const ABI = require('../../config/abi.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));


// Change These Variables
// --------------------------------------------------
const tokens = [
    {
        "chainId": 43114,
        "address": "0x60781C2586D68229fde47564546784ab3fACA982",
        "decimals": 18,
        "name": "Pangolin",
        "symbol": "PNG",
        "logoURI": "https://raw.githubusercontent.com/pangolindex/tokens/main/assets/0x60781C2586D68229fde47564546784ab3fACA982/logo.png"
    },
    {
        "chainId": 43114,
        "address": "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
        "decimals": 18,
        "name": "Wrapped AVAX",
        "symbol": "WAVAX",
        "logoURI": "https://raw.githubusercontent.com/pangolindex/tokens/main/assets/0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7/logo.png"
    },
];
// --------------------------------------------------


/*
 * Verify tokenlist information like name, symbol, decimals, etc.
 */
(async () => {
    const table = [];

    for (const token of tokens) {
        const tokenContract = new web3.eth.Contract(ABI.TOKEN, token.address.toLowerCase());
        const [ name, symbol, decimals ] = await Promise.all([
            tokenContract.methods.name().call(),
            tokenContract.methods.symbol().call(),
            tokenContract.methods.decimals().call()
        ]);
        table.push({
            name,
            checksum: web3.utils.checkAddressChecksum(token.address),
            logoMatch: token.logoURI.includes(token.address),
            symbol: `${token.symbol} vs. ${symbol}`,
            symbolMatch: token.symbol === symbol,
            decimals: `${token.decimals} vs. ${decimals}`,
            decimalsMatch: parseInt(token.decimals) === parseInt(decimals),
        });
    }

    console.table(table);
})();
