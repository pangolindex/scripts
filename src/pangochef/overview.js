const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');
const Helpers = require('../core/helpers');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));

// Change These Variables
// --------------------------------------------------
const pangoChefAddress = ADDRESS.SONGBIRD_PANGO_CHEF;
// --------------------------------------------------

/*
 * Lists information about all pools in PangoChef
 */
(async () => {
    const start = Date.now();

    const pangoChefContract = new web3.eth.Contract(ABI.PANGO_CHEF, pangoChefAddress.toLowerCase());

    const poolCount = parseInt(await pangoChefContract.methods.poolsLength().call());
    const poolIds = Helpers.createArrayOfNumbers(0, poolCount - 1);

    const table = await Helpers.promiseAllChunked(poolIds, lookup, 10, null, 500);
    table.sort((a,b) => a.pid > b.pid ? 1 : -1);
    const totalAllocPoints = table.reduce((sum, {weight}) => sum + parseInt(weight), 0);

    console.log(`Completed in ${(Date.now() - start) / 1000} sec`);

    console.table(table);
    console.log(`Total alloc points: ${totalAllocPoints.toLocaleString()}`);


    async function lookup(poolId) {
        const [poolInfo, poolRewardInfo] = await Promise.all([
            pangoChefContract.methods.pools(poolId).call(),
            pangoChefContract.methods.poolRewardInfos(poolId).call(),
        ]);

        const recipientSymbols = parseInt(poolInfo.poolType) === 1
            ? await Helpers.getPairTokenSymbolsCached(poolInfo.tokenOrRecipient)
            : [undefined, undefined];

        const poolTypeFriendly =
              parseInt(poolInfo.poolType) === 1 ? 'ERC20 Pool'
            : parseInt(poolInfo.poolType) === 2 ? 'Relayer Pool'
            : 'Unset Pool';

        console.log(`pid #${poolId}: (${recipientSymbols[0]}-${recipientSymbols[1]}) weight ${poolRewardInfo.weight}`);
        return {
            pid: poolId,
            type: poolTypeFriendly,
            recipient: poolInfo.tokenOrRecipient,
            rewarder: poolInfo.rewarder,
            token0: recipientSymbols[0],
            token1: recipientSymbols[1],
            weight: poolRewardInfo.weight,
        };
    }
})();
