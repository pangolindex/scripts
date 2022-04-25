const CONFIG = require('./config/config');

module.exports = {
    networks: {
        hardhat: {
            chainId: 43114,
            timeout: 1200000,
            blockGasLimit: 8000000,
        },
        local: {
            chainId: 43114,
            url: 'http://localhost:8545/ext/bc/C/rpc',
        },
        fuji: {
            chainId: 43113,
            url: 'https://api.avax-test.network/ext/bc/C/rpc',
            account: !!CONFIG.WALLET.KEY ? [CONFIG.WALLET.KEY] : undefined,
        },
        mainnet: {
            chainId: 43114,
            url: 'https://api.avax.network/ext/bc/C/rpc',
            account: !!CONFIG.WALLET.KEY ? [CONFIG.WALLET.KEY] : undefined,
        },
    },
};
