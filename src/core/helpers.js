const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));

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

    getPair(
        tokenA,
        tokenB,
        _factory = '0xefa94de7a4656d787667c749f7e1223d71e9fd88',
        _initHash = '40231f6b438bce0797c9ada29b718a87ea0a5cea3fe9a771abdd76bd41a3e545',
    ) {
        const packing = '000000000000000000000000';

        let [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA];

        let encodedTokens =  web3.eth.abi.encodeParameters(['address', 'address'], [token0, token1]);
        let encodedTokensPacked = encodedTokens.split(packing).join('');

        let salt = web3.utils.soliditySha3(encodedTokensPacked);

        let encodedFactory =  web3.eth.abi.encodeParameters(['address', 'bytes32'], [_factory, salt]);
        let encodedFactoryPacked = encodedFactory.split(packing).join('');

        let hashedData = web3.utils.soliditySha3( '0xff' + encodedFactoryPacked.slice(2) + _initHash )

        return '0x' + hashedData.slice(26);
    },

    keccak256(...args) {
        return Web3.utils.soliditySha3(...args);
    },

    toChecksumAddress: (address) => web3.utils.toChecksumAddress(address.toLowerCase()),
};

module.exports = Helpers;
