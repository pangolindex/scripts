# Single Side Staking

Commonly used actions for interacting with the Synthetix-based StakingRewards. The scripts are prefaced with a number 
denoting the order they should be executed for a full deployment. All configuration is done via the `stakingConfig.js` 
file and should be modified and double-checked for accuracy before proceeding.

### `1-setDurationEOA.js`
After the StakingRewards contract is deployed, the duration period must be declared. This script performs the task via 
an externally owned address (EOA) for scenarios where the deployer has not already transferred ownership to a multisig.

### `1-setDurationMulti.js`
After the StakingRewards contract is deployed, the duration period must be declared. This script performs the task via
a gnosis multisig or gnosis safe for scenarios where the deployer has already transferred ownership to a multisig.

### `2-transferOwnershipEOA.js`
After the StakingRewards contract is deployed, ownership should be transferred to a less central point of failure such 
as a multisig wallet. This script facilitates an EOA transferring ownership to a multisig.

### `3-fundMulti.js`
StakingRewards requires reward funds be sent to the contract. This script facilitates sending an ERC20 compatible token 
from the provided multisig to the staking contract.

### `4-beginRewardsMulti.js`
After all setup have been completed, the final step is to begin the first staking period. This script facilitates 
beginning the accumulation ("farming") process.
