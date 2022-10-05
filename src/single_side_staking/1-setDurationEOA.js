// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const StakingConfig = require('./stakingConfig');
const StakingRewards = require('@pangolindex/exchange-contracts/artifacts/contracts/staking-rewards/StakingRewards.sol/StakingRewards.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
let gasSpent = web3.utils.toBN(0);


/*
 * Sets the duration of the staking contract. Must be sent from an end user wallet
 */
(async () => {
    const stakingRewardsContract = new web3.eth.Contract(StakingRewards.abi, StakingConfig.STAKING_CONTRACT);

    const tx = stakingRewardsContract.methods.setRewardsDuration(
        StakingConfig.DURATION,
    );

    const gas = await tx.estimateGas({ from: CONFIG.WALLET.ADDRESS });
    const baseGasPrice = await web3.eth.getGasPrice();

    console.log(`Submitting tx ...`);

    const receipt = await tx.send({
        from: CONFIG.WALLET.ADDRESS,
        gas,
        maxFeePerGas: baseGasPrice * 2,
        maxPriorityFeePerGas: web3.utils.toWei('1', 'nano'),
    });

    gasSpent.iadd(web3.utils.toBN(receipt.effectiveGasPrice).mul(web3.utils.toBN(receipt.gasUsed)));

    if (!receipt?.status) {
        console.log(receipt);
        process.exit(1);
    } else {
        console.log(`Transaction hash: ${receipt.transactionHash}`);
    }

})()
    .catch(console.error)
    .finally(async () => {
        console.log(`Gas spent: ${gasSpent / (10 ** 18)}`);
        process.exit(0);
    });
