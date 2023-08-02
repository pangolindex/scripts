const { ChainId } = require("@pangolindex/sdk");
const CONFIG = require("../../config/config.js");
const { getfarms, showFarmsFriendly } = require("./utils");

// Change These Variables in config file
// --------------------------------------------------
const chainId = CONFIG.CHAINID;
// --------------------------------------------------

/*
 * Lists information about all pools in PangoChef
 */
(async (chainId) => {
    const start = Date.now();
    const pangoFarms = await getfarms(chainId);
    showFarmsFriendly(pangoFarms);
    console.log(`Completed in ${(Date.now() - start) / 1000} sec`);
})(chainId);
