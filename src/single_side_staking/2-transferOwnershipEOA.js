// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const StakingConfig = require('./stakingConfig');
const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);


/*
 * Transfer ownership of the staking contract to the multisig. Must be sent from an end user wallet
 */
(async () => {
    const stakingContract = new web3.eth.Contract(ABI.STAKING_REWARDS, StakingConfig.STAKING_CONTRACT);

    const tx = stakingContract.methods.transferOwnership(
        ADDRESS.PANGOLIN_MULTISIG_ADDRESS,
    );

    console.log(`Submitting tx ...`);

    const receipt = await tx.send({
        from: CONFIG.WALLET.ADDRESS,
        gas: await tx.estimateGas({ from: CONFIG.WALLET.ADDRESS }),
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
