// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const CONSTANTS = require('../core/constants');
const ABI = require('../../config/abi.json');
const StakingConfig = require('./stakingConfig');
const { propose: gnosisMultisigPropose } = require('../core/gnosisMultisig');
const { propose: gnosisSafePropose } = require('../core/gnosisSafe');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
let startingAvax;
let endingAvax;


/*
 * Sends funds from the multisig to the staking contract
 */
(async () => {
    startingAvax = await web3.eth.getBalance(CONFIG.WALLET.ADDRESS);
    console.log(`Starting AVAX: ${startingAvax / (10 ** 18)}`);

    const rewardTokenContract = new web3.eth.Contract(ABI.TOKEN, StakingConfig.REWARD_ADDRESS);

    const tx = rewardTokenContract.methods.transfer(
        StakingConfig.STAKING_CONTRACT,
        StakingConfig.AMOUNT,
    );

    switch (StakingConfig.MULTISIG_TYPE) {
        case CONSTANTS.GNOSIS_MULTISIG:
            const receipt = gnosisMultisigPropose({
                multisigAddress: StakingConfig.MULTISIG_OWNER,
                destination: StakingConfig.STAKING_CONTRACT,
                value: 0,
                bytecode: tx.encodeABI(),
            });

            if (!receipt?.status) {
                console.log(receipt);
                process.exit(1);
            } else {
                console.log(`Transaction hash: ${receipt.transactionHash}`);
            }
            break;
        case CONSTANTS.GNOSIS_SAFE:
            await gnosisSafePropose({
                multisigAddress: StakingConfig.MULTISIG_OWNER,
                destination: StakingConfig.STAKING_CONTRACT,
                value: 0,
                bytecode: tx.encodeABI(),
            });
            break;
        default:
            throw new Error(`Unknown multisig type: ${StakingConfig.MULTISIG_TYPE}`);
    }
})()
    .catch(console.error)
    .finally(async () => {
        endingAvax = await web3.eth.getBalance(CONFIG.WALLET.ADDRESS);
        console.log(`Ending AVAX: ${endingAvax / (10 ** 18)}`);
        console.log(`AVAX spent: ${(startingAvax - endingAvax) / (10 ** 18)}`);
        process.exit(0);
    });
