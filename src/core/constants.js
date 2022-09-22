const constants = {
    GNOSIS_MULTISIG: 'GNOSIS_MULTISIG',
    GNOSIS_SAFE: 'GNOSIS_SAFE',
    EOA: 'EOA',

    PoolType: {
        UNSET_POOL: 0,
        ERC20_POOL: 1,
        RELAYER_POOL: 2,
    },

    MAX_UINT256: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',

    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
};

module.exports = constants;
