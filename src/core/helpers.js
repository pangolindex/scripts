const ABI = require('../../config/abi.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));

const Helpers = {
    symbolCache: {},

    getSymbolCached: async (address) => {
        if (Helpers.symbolCache[address]) return Helpers.symbolCache[address];
        const contract = new web3.eth.Contract(ABI.TOKEN, address);
        return Helpers.symbolCache[address] = await contract.methods.symbol().call();
    },

    toChecksumAddress: (address) => web3.utils.toChecksumAddress(address.toLowerCase()),
};

module.exports = Helpers;
