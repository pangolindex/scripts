# Fee Collector

Common tasks for interacting with FeeCollector

### `harvest.js`
Initiate a PNG buyback using Pangolin protocol's accumulated swap fees. Callers earn a small incentive for doing this. 
The buyback funds the PNG staking program and the Pangolin treasury. 
Specify the minimum incentive fee required to execute a buyback in terms of AVAX (default is 0.05 AVAX). 
Configuration is done internally to the script.
