module.exports = {
    networks: {
        hardhat: {
            chainId: 43114,
            timeout: 1200000,
        },
        local: {
            chainId: 43114,
            url: 'http://127.0.0.1:8545',
        },
        fuji: {
            url: 'https://api.avax-test.network/ext/bc/C/rpc',
        },
        mainnet: {
            url: 'https://api.avax.network/ext/bc/C/rpc',
        }
    }
};
