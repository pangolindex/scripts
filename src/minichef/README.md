# MiniChef

Common tasks for interacting with MiniChefV2

### `addFarms.js`
Add farms by providing their PGL address, weight, and rewarder address for SuperFarms. Configuration is done 
internally to the script. Note: weight values are provided as they are onchain ie. `500` denotes a weight of `5x`.

### `updateFarms.js`
Modify the weights of farms and rewarder for SuperFarms. Changing a weight to `0` will effectively "remove" the farm. 
All configuration is done internally to the script. The `util/miniChefOverview.js` script may prove helpful for 
obtaining farm pids.