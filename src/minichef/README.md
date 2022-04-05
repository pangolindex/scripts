# MiniChef

Common tasks for interacting with MiniChefV2

### `addFarms.js`
Add farms by providing their PGL address, weight, and rewarder address for SuperFarms. Configuration is done 
internally to the script. Note: weight values are provided as they are onchain ie. `500` denotes a weight of `5x`.

### `deployRewarders.js`
Deploys RewarderViaMultiplier contracts required to launch SuperFarms. Also submits multisig transactions to facilitate
the funding of the rewarders. All configuration is done internally to the script.

### `overview.js`
Lists information about all pools in MiniChefV2 including the PGL, rewarder, tokens, and farm weight.

### `superFarmCredits.js`
Calculate reward credits (including credits) for all users who have interacted with a SuperFarm.

### `unclaimedPNG.js`
Calculate the total outstanding immediately claimable PNG base rewards for a MiniChef pool.

### `updateFarms.js`
Modify the weights of farms and rewarder for SuperFarms. Changing a weight to `0` will effectively "remove" the farm. 
All configuration is done internally to the script. The `util/miniChefOverview.js` script may prove helpful for 
obtaining farm pids.
