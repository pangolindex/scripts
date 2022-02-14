// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const StakingConfig = require('./stakingConfig');
const ABI = require('../../config/abi.json');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);


/*
 * Sends funds from the multisig to the staking contract
 */
(async () => {
    const multiContract = new web3.eth.Contract(ABI.GNOSIS_MULTISIG, StakingConfig.MULTISIG_OWNER);
    const rewardTokenContract = new web3.eth.Contract(ABI.TOKEN, StakingConfig.REWARD_ADDRESS);

    const tx = rewardTokenContract.methods.transfer(
        StakingConfig.STAKING_CONTRACT,
        StakingConfig.AMOUNT,
    );

    const multiTX = multiContract.methods.submitTransaction(
        rewardTokenContract._address,
        0,
        tx.encodeABI(),
    );

    const gas = await multiTX.estimateGas({ from: CONFIG.WALLET.ADDRESS });
    const baseGasPrice = await web3.eth.getGasPrice();

    console.log(`Submitting tx ...`);

    const receipt = await multiTX.send({
        from: CONFIG.WALLET.ADDRESS,
        gas,
        maxFeePerGas: baseGasPrice * 2,
        maxPriorityFeePerGas: web3.utils.toWei('2', 'nano'),
    });

    if (!receipt?.status) {
        console.log(receipt);
        process.exit(1);
    } else {
        console.log(`Transaction hash: ${receipt.transactionHash}`);
    }

})()
  .catch(console.error)
  .finally(process.exit);
