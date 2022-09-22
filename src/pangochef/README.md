# PangoChef

Common tasks for interacting with PangoChef

### `initializePools.js`
Initialize pool by providing recipient address and pool type. Configuration is done internally to the script.

### `overview.js`
Lists information about all pools in PangoChef including the pool recipient, weight, tokens, and rewarder.

### `setRewarders.js`
Modify pool rewarders. Can add/modify a rewarder by providing the address, and remove a rewarder by
providing the 0x0 address.

### `setWeights.js`
Modify the weights of pools. Changing a weight to `0` will effectively "remove" the farm. 
All configuration is done internally to the script. The `overview.js` script may prove helpful for 
obtaining farm pids.
