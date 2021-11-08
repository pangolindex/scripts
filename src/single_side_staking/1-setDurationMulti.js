// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const StakingConfig = require('./stakingConfig');
const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);


/*
 * Sets the duration of the staking contract
 */
(async () => {
    const multiContract = new web3.eth.Contract(ABI.GNOSIS_MULTISIG, ADDRESS.PANGOLIN_MULTISIG_ADDRESS);
    const stakingContract = new web3.eth.Contract(ABI.STAKING_REWARDS, StakingConfig.STAKING_CONTRACT);

    const tx = stakingContract.methods.setRewardsDuration(
        StakingConfig.DURATION,
    );

    const multiTX = multiContract.methods.submitTransaction(
        stakingContract._address,
        0,
        tx.encodeABI(),
    );

    console.log(`Submitting tx ...`);

    const receipt = await multiTX.send({
        from: CONFIG.WALLET.ADDRESS,
        gas: await multiTX.estimateGas({ from: CONFIG.WALLET.ADDRESS }),
        gasPrice: await web3.eth.getGasPrice(),
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
