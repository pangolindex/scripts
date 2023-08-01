const { ChainId } = require('@pangolindex/sdk');
const CONFIG = require('../../config/config.js')
const { getfarms } = require('./utils');

// Change These Variables in config file
// --------------------------------------------------
const chainId = CONFIG.CHAINID;
// --------------------------------------------------

/*
 * Lists information about all pools in PangoChef
 */
(async (chainId) => {
    const start = Date.now();

    const farms = await getfarms(chainId);

    const totalAllocPoints = farms.reduce((sum, {weight}) => sum + weight, 0);

    console.table(farms);
    console.log(`Total alloc points: ${totalAllocPoints}`);
    console.log(`Completed in ${(Date.now() - start) / 1000} sec`);
})(chainId);
