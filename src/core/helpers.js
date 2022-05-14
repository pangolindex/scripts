const ABI = require('../../config/abi.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));

const Helpers = {
    symbolCache: {},
    decimalsCache: {},
    token0Cache: {},
    token1Cache: {},

    getSymbolCached: async (address) => {
        if (Helpers.symbolCache[address]) return Helpers.symbolCache[address];
        const contract = new web3.eth.Contract(ABI.TOKEN, address);
        return Helpers.symbolCache[address] = await contract.methods.symbol().call();
    },

    getDecimalsCached: async (address) => {
        if (Helpers.decimalsCache[address]) return Helpers.decimalsCache[address];
        const contract = new web3.eth.Contract(ABI.TOKEN, address);
        return Helpers.decimalsCache[address] = parseInt(await contract.methods.decimals().call());
    },

    getToken0Cached: async (address) => {
        if (Helpers.token0Cache[address]) return Helpers.token0Cache[address];
        const contract = new web3.eth.Contract(ABI.PAIR, address);
        return Helpers.token0Cache[address] = await contract.methods.token0().call();
    },

    getToken1Cached: async (address) => {
        if (Helpers.token1Cache[address]) return Helpers.token1Cache[address];
        const contract = new web3.eth.Contract(ABI.PAIR, address);
        return Helpers.token1Cache[address] = await contract.methods.token1().call();
    },

    getTokensCached: async (address) => {
        return await Promise.all([
            Helpers.getToken0Cached(address),
            Helpers.getToken1Cached(address),
        ]);
    },

    async promiseAllChunked(data, handlerFn, chunkSize, progressFn, delay) {
        const clonedData = [...data];
        let results = [];
        while (clonedData.length) {
            const chunk = await Promise.all(clonedData.splice(0, chunkSize).map(handlerFn));
            results = results.concat(chunk);
            if (progressFn) await progressFn(chunk, results);
            if (delay) await Helpers.sleep(delay);
        }
        return results;
    },

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    toChecksumAddress: (address) => web3.utils.toChecksumAddress(address.toLowerCase()),
};

module.exports = Helpers;
