const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));


// Change These Variables
// ---------------------------------------------------------------
const factoryAddress = ADDRESS.PANGOLIN_FACTORY;
// ---------------------------------------------------------------


/*
 * Lists all pools for a UniswapV2-based DEX.
 */
(async () => {
    const factoryContract = new web3.eth.Contract(ABI.FACTORY, factoryAddress);

    const poolCount = await factoryContract.methods.allPairsLength().call();

    console.log(`Found ${poolCount} pools`);

    for (let i=0; i<poolCount; i++) {
        const pglAddress = await factoryContract.methods.allPairs(i).call();
        const pgl = new web3.eth.Contract(ABI.PAIR, pglAddress);
        const [ token0Address, token1Address ] = await Promise.all([
            pgl.methods.token0().call(),
            pgl.methods.token1().call(),
        ]);
        const token0 = new web3.eth.Contract(ABI.TOKEN, token0Address);
        const token1 = new web3.eth.Contract(ABI.TOKEN, token1Address);

        try {
            // Token is a loose standard and might not have a `name` method
            const [ symbol0, symbol1 ] = await Promise.all([
                token0.methods.symbol().call(),
                token1.methods.symbol().call(),
            ]);
            console.log(`${pglAddress} (${i}): ${symbol0}-${symbol1}`);
        } catch (e) {
            console.error(`Invalid symbol() call for ${pglAddress} (${i})`);
        }
    }
})();
