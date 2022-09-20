module.exports = {

    WALLET: {
        ADDRESS: process.env.WALLET_ADDRESS,
        KEY: process.env.WALLET_KEY
    },

    RPC: process.env.RPC ?? 'https://api.avax.network/ext/bc/C/rpc',

};
