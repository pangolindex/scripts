// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

(async () => {
    const multiContract = new web3.eth.Contract(ABI.GNOSIS_MULTISIG, ADDRESS.PANGOLIN_MULTISIG_ADDRESS);
    const miniChefContract = new web3.eth.Contract(ABI.MINICHEF_V2, ADDRESS.PANGOLIN_MINICHEF_V2_ADDRESS);

    // Calculating desired reward rate
    const dailyEmission = web3.utils.toBN('175342465000000000000000');
    const bonusEmission = web3.utils.toBN('2000000' + '0'.repeat(18)).div(web3.utils.toBN('30'));
    const desiredRewardRate = dailyEmission.add(bonusEmission).divn(86400);

    // Getting pseudo-constant onchain info
    const rewardsExpiration = web3.utils.toBN(await miniChefContract.methods.rewardsExpiration().call());
    const rewardsPerSecond = web3.utils.toBN(await miniChefContract.methods.rewardPerSecond().call());

    // Getting current onchain info
    const executionTime = Date.now() + (4 * HOUR);
    const blockTime = web3.utils.toBN(Math.floor(executionTime / 1000));
    const remainingTime = rewardsExpiration.sub(blockTime);
    const remainingRewards = remainingTime.mul(rewardsPerSecond);

    // Offchain calculations
    const DURATION = remainingRewards.div(desiredRewardRate);

    console.log(`Duration: ${DURATION.toString()}`);

    const tx = miniChefContract.methods.resetRewardsDuration(
        DURATION.toString(),
    );

    const multiTX = multiContract.methods.submitTransaction(
        miniChefContract._address,
        0,
        tx.encodeABI(),
    );

    // Execution check safeguard
    await tx.estimateGas({ from: multiContract._address });

    const receipt = await multiTX.send({
        from: CONFIG.WALLET.ADDRESS,
        gas: await multiTX.estimateGas({ from: CONFIG.WALLET.ADDRESS }),
        gasPrice: await web3.eth.getGasPrice()
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
