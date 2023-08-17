const {CHAINS, ChainId} = require("@pangolindex/sdk");
require("dotenv").config();

const chainId = ChainId.AVALANCHE;
const chain = CHAINS[chainId];

module.exports = {

    WALLET: {
        ADDRESS: process.env.WALLET_ADDRESS,
        KEY: process.env.WALLET_KEY
    },

    RPC: chain.rpc_uri,
    CHAINID: chainId,
};
