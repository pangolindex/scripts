const CONFIG = require("../../config/config.js");
const { getFarms, showFarmsFriendly } = require("./utils");

// Change These Variables in config file
// --------------------------------------------------
const chainId = CONFIG.CHAINID;
// --------------------------------------------------

/*
 * Lists information about all pools in PangoChef
 */
(async (chainId) => {
    const start = Date.now();
    const pangoFarms = await getFarms(chainId);
    showFarmsFriendly(pangoFarms);
    console.log(`Completed in ${(Date.now() - start) / 1000} sec`);
})(chainId);
