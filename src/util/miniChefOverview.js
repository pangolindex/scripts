const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));


/*
 * Lists all of the pools in MiniChefV2 and some pool information
 */
(async () => {
    const miniChefContract = new web3.eth.Contract(ABI.MINICHEF_V2, ADDRESS.PANGOLIN_MINICHEF_V2_ADDRESS);

    const lpTokens = await miniChefContract.methods.lpTokens().call();
    const poolInfos = await miniChefContract.methods.poolInfos().call();
    let totalAllocPoints = 0;

    const table = [];

    let pid = 0;
    for (const pgl of lpTokens) {
        const pglContract = new web3.eth.Contract(ABI.PAIR, pgl);
        const [token0, token1] = await Promise.all([
            pglContract.methods.token0().call(),
            pglContract.methods.token1().call(),
        ]);

        const token0Contract = new web3.eth.Contract(ABI.TOKEN, token0);
        const token1Contract = new web3.eth.Contract(ABI.TOKEN, token1);

        const [token0Symbol, token1Symbol, rewarder] = await Promise.all([
            token0Contract.methods.symbol().call(),
            token1Contract.methods.symbol().call(),
            miniChefContract.methods.rewarder(pid).call(),
        ]);

        console.log(`pid #${pid}: (${token0Symbol}-${token1Symbol}) weight ${poolInfos[pid].allocPoint}`);
        table.push({
            pid: pid,
            pgl: pgl.toLowerCase(),
            rewarder: rewarder,
            token0: token0Symbol,
            token1: token1Symbol,
            weight: poolInfos[pid].allocPoint,
        });

        totalAllocPoints += parseInt(poolInfos[pid].allocPoint);

        pid++;
    }

    console.table(table);
    console.log(`Total alloc points: ${totalAllocPoints}`);

})();
