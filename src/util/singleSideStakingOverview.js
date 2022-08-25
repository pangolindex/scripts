const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));


// Change These Variables
// --------------------------------------------------
const stakingContractAddresses = [
    '0xD49B406A7A29D64e081164F6C3353C599A2EeAE9', // PNG > WAVAX
    '0xf0eFf017644680B9878429137ccb2c041b4Fb701', // PNG > OOE
    '0xfe1d712363f2B1971818DBA935eEC13Ddea474cc', // PNG > APEIN
    '0x78d4BFb3b50E5895932073DC5Eb4713eb532941B', // PNG > ORBS
    '0x88afdaE1a9F58Da3E68584421937E5F564A0135b', // PNG > PNG
];
// --------------------------------------------------


/*
 * Lists info about single side staking farms
 */
(async () => {
    const table = [];

    console.log(`Fetching information ...`);

    let pid = 0;
    for (const stakingContractAddress of stakingContractAddresses) {
        const stakingContract = new web3.eth.Contract(ABI.STAKING_REWARDS, stakingContractAddress);
        const [
            stakingTokenAddress,
            rewardsTokenAddress,
            amountStaked,
            rewardRate,
            periodFinish,
        ] = await Promise.all([
            stakingContract.methods.stakingToken().call(),
            stakingContract.methods.rewardsToken().call(),
            stakingContract.methods.totalSupply().call(),
            stakingContract.methods.rewardRate().call(),
            stakingContract.methods.periodFinish().call(),
        ]);

        const stakingTokenContract = new web3.eth.Contract(ABI.TOKEN, stakingTokenAddress);
        const rewardsTokenContract = new web3.eth.Contract(ABI.TOKEN, rewardsTokenAddress);

        const [
            stakingTokenSymbol,
            rewardsTokenSymbol,
            stakingTokenDecimals,
            rewardsTokenDecimals,
            currentRewardBalance,
        ] = await Promise.all([
            stakingTokenContract.methods.symbol().call(),
            rewardsTokenContract.methods.symbol().call(),
            stakingTokenContract.methods.decimals().call(),
            rewardsTokenContract.methods.decimals().call(),
            rewardsTokenContract.methods.balanceOf(stakingContractAddress).call(),
        ]);

        const secondsRemaining = Math.floor(((periodFinish * 1000) - Date.now()) / 1000);
        const activeFunding = Math.max(secondsRemaining * rewardRate, 0);

        const adjustedRewardRate = (periodFinish * 1000) > Date.now()
            ? rewardRate
            : 0;

        const unclaimedReward = stakingTokenAddress === rewardsTokenAddress
            ? currentRewardBalance - amountStaked
            : currentRewardBalance;

        console.log(`${stakingTokenSymbol} > ${rewardsTokenSymbol}`);

        table.push({
            stakingContract: stakingContractAddress,
            stakingToken: stakingTokenSymbol.toUpperCase(),
            rewardsToken: rewardsTokenSymbol.toUpperCase(),
            amountStaked: (amountStaked / (10 ** stakingTokenDecimals)).toLocaleString(),
            unclaimedReward: (unclaimedReward / (10 ** rewardsTokenDecimals)).toLocaleString(),
            remainingFunding: (activeFunding / (10 ** rewardsTokenDecimals)).toLocaleString(),
            rewardRate: (adjustedRewardRate / (10 ** rewardsTokenDecimals)).toLocaleString(undefined, {minimumFractionDigits: 5}),
            expires: (new Date(periodFinish * 1000)).toLocaleString(),
        });
        pid++;
    }

    console.table(table);
})();
