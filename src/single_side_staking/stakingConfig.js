const CONSTANTS = require('../core/constants');
const DAY = 86400;

const StakingConfig = {
    AMOUNT: '435634' + '0'.repeat(18),
    DURATION: (14 * DAY).toString(),
    REWARD_ADDRESS: '0x60781C2586D68229fde47564546784ab3fACA982', // PNG
    STAKING_CONTRACT: '0x88afdaE1a9F58Da3E68584421937E5F564A0135b', // PNG -> PNG
    MULTISIG_OWNER: '0x7491158583ccb44a4678b3D1eCCC1f41aeD10a1F',
    MULTISIG_TYPE: CONSTANTS.GNOSIS_MULTISIG,
};

module.exports = StakingConfig;
