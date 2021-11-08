const DAY = 86400;

const StakingConfig = {
    AMOUNT: '400000' + '0'.repeat(18),
    DURATION: (30 * DAY).toString(),
    REWARD_ADDRESS: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX
    STAKING_CONTRACT: '0xD49B406A7A29D64e081164F6C3353C599A2EeAE9', // PNG -> WAVAX
};

module.exports = StakingConfig;
