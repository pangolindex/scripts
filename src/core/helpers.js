const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const Web3 = require('web3');
const { CHAINS, Token } = require('@pangolindex/sdk');
const { fetchMultipleContractSingleData } = require('../util/multicall');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));

const Helpers = {
    symbolCache: {},
    decimalsCache: {},
    token0Cache: {},
    token1Cache: {},
    tokens: {},

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

    getToken0SymbolCached: async (address) => {
        const token0Address = await Helpers.getToken0Cached(address);
        return await Helpers.getSymbolCached(token0Address);
    },

    getToken1Cached: async (address) => {
        if (Helpers.token1Cache[address]) return Helpers.token1Cache[address];
        const contract = new web3.eth.Contract(ABI.PAIR, address);
        return Helpers.token1Cache[address] = await contract.methods.token1().call();
    },

    getToken1SymbolCached: async (address) => {
        const token1Address = await Helpers.getToken1Cached(address);
        return await Helpers.getSymbolCached(token1Address);
    },

    getPairTokensCached: async (address) => {
        return await Promise.all([
            Helpers.getToken0Cached(address),
            Helpers.getToken1Cached(address),
        ]);
    },

    getPairTokenSymbolsCached: async (address) => {
        return await Promise.all([
            Helpers.getToken0SymbolCached(address),
            Helpers.getToken1SymbolCached(address),
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

    isSameAddress(a, b) {
        if (!a || !b) return false;
        return a.toLowerCase() === b.toLowerCase();
    },

    createArrayOfNumbers(a, b) {
        const arr = [];
        for (let i = a; i <= b; i++) arr.push(i);
        return arr;
    },

  getTokenCached: async (address, chainId) => {
        if (Helpers.tokens[address]) return Helpers.token0Cache[address];

        const chain = CHAINS[chainId];
        const contract = new web3.eth.Contract(ABI.TOKEN, address);
        const multicall = new web3.eth.Contract(
            ABI.MULTICALL,
            chain.contracts?.multicall
        );

        const calls = [
            {
                target: address,
                callData: encodeFunction(contract, "name"),
            },
            {
                target: address,
                callData: encodeFunction(contract, "symbol"),
            },
            {
                target: address,
                callData: encodeFunction(contract, "decimals"),
            },
        ];
        const { returnData } = await fetchMulticallData(multicall, calls);

        const name = decodeBytecodeResult(contract, "name", returnData[0])[0];
        const symbol = decodeBytecodeResult(contract, "symbol", returnData[1])[0];
        const decimals = decodeBytecodeResult(
            contract,
            "decimals",
            returnData[2]
        )[0];
        const token = new Token(chainId, address, decimals, symbol, name);
        token[address] = token;
        return token;
  },

  getTokensCached: async (addresses, chainId) => {
        //remove duplicates and cached tokens
        const tokensAddresses = [...new Set(addresses)].filter(
            (address) => !Helpers.tokens[address]
        );

        const tokensContract = tokensAddresses.map(
            (address) => new web3.eth.Contract(ABI.TOKEN, address)
        );

        if (tokensAddresses.length === 0) return Helpers.tokens;

        const multicall = new web3.eth.Contract(
            ABI.MULTICALL,
            CHAINS[chainId].contracts?.multicall
        );

        const [_names, _symbols, _decimals] = await Promise.all([
            fetchMultipleContractSingleData(multicall, tokensContract, "name"),
            fetchMultipleContractSingleData(multicall, tokensContract, "symbol"),
            fetchMultipleContractSingleData(multicall, tokensContract, "decimals"),
        ]);

        for (let index = 0; index < tokensContract.length; index++) {
            const tokenAddress = tokensAddresses[index];
            const tokenName = _names[index];
            const tokenSymbol = _symbols[index];
            const tokenDecimals = _decimals[index];
            Helpers.tokens[tokenAddress] = new Token(
                chainId, 
                tokenAddress, 
                parseInt(tokenDecimals[0]), 
                tokenSymbol[0], 
                tokenName[0]
            );
        }

        return Helpers.tokens;
  },
};

module.exports = Helpers;
