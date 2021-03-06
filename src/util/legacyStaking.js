const ABI = require('../../config/abi.json');
const Helpers = require('../core/helpers');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));


// Change These Variables
// --------------------------------------------------
const stakingContractAddressesV0 = [
    '0xa16381eae6285123c323A665D4D99a6bCfaAC307',
    '0x4f019452f51bbA0250Ec8B69D64282B79fC8BD9f',
    '0x01897e996EEfFf65AE9999C02D1d8D7E9e0C0352',
    '0x8FD2755c6ae7252753361991bDcd6fF55bDc01CE',
    '0x7d7eCd4d370384B17DFC1b4155a8410e97841B65',
    '0xb5b9DEd9C193731f816AE1f8FfB7f8B0FaE40c88',
    '0xe4d9aE03859DaC6d65432d557F75b9b588a38eE1',
    '0x88f26b81c9cae4ea168e31BC6353f493fdA29661',
    '0xEe0023108918884181E48902f7C797573F413EcE',
    '0x797CBcf107519f4b279Fc5Db372e292cdF7e6956',
    '0x4e550fEfBf888cB43eaD73d821f646F43b1F2309',
    '0x7accC6f16Bf8c0Dce22371fbD914c6B5b402BF9f',
    '0x99B06B9673fea30Ba55179b1433ce909Fdc28723',
    '0x4Ad6e309805cb477010beA9fFC650cB27C1A9504',
    '0x8866077F08b076360C25F4Fd7fbC959ef135474C',
    '0x41188B4332fe68135d1524E43db98e81519d263B',
    '0x6955Cb85edEa63F861c0Be39C3d7F8921606c4Dc',
    '0xb921a3aE9CeDa66fa8A74DBb0946367FB14faE34',
    '0x2061298C76cD76219b9b44439e96A75F19C61f7f',
];
const stakingContractAddressesV1 = [
    '0x417C02150b9a31BcaCb201d1D60967653384E1C6',
    '0x830A966B9B447c9B15aB24c0369c4018E75F31C9',
    '0x94C021845EfE237163831DAC39448cFD371279d6',
    '0x006cC053bdb84C2d6380B3C4a573d84636378A47',
    '0xe968E9753fd2c323C2Fe94caFF954a48aFc18546',
    '0x30CbF11f6fcc9FC1bF6E55A6941b1A47A56eAEC5',
    '0x574d3245e36Cf8C9dc86430EaDb0fDB2F385F829',
    '0xBDa623cDD04d822616A263BF4EdbBCe0B7DC4AE7',
    '0x2e10D9d08f76807eFdB6903025DE8e006b1185F5',
    '0x701e03fAD691799a8905043C0d18d2213BbCf2c7',
    '0x63A84F66b8c90841Cb930F2dC3D28799F0c6657B',
    '0x1F6aCc5F5fE6Af91C1BB3bEbd27f4807a243D935',
    '0x6E36A71c1A211f01Ff848C1319D4e34BB5483224',
    '0xDA354352b03f87F84315eEF20cdD83c49f7E812e',
    '0x2D55341f2abbb5472020e2d556a4f6B951C8Fa22',
    '0x4dF32F1F8469648e89E62789F4246f73fe768b8E',
    '0xa04fCcE7955312709c838982ad0E297375002C32',
    '0x2C31822F35506C6444F458Ed7470c79f9924Ee86',
    '0x642c5B7AC22f56A0eF87930a89f0980FcA904B03',
    '0x640D754113A3CBDd80BcCc1b5c0387148EEbf2fE',
    '0xf2b788085592380bfCAc40Ac5E0d10D9d0b54eEe',
    '0xd3e5538A049FcFcb8dF559B85B352302fEfB8d7C',
    '0x4E258f7ec60234bb6f3Ea7eCFf5931901182Bd6E',
    '0x21CCa1672E95996413046077B8cf1E52F080A165',
    '0x4219330Af5368378D5ffd869a55f5F2a26aB898c',
    '0xd7EDBb1005ec65721a3976Dba996AdC6e02dc9bA',
    '0x079a479e270E72A1899239570912358C6BC22d94',
    '0x99918c92655D6f8537588210cD3Ddd52312CB36d',
    '0xb600429CCD364F1727F91FC0E75D67d65D0ee4c5',
    '0x29a7F3D1F27637EDA531dC69D989c86Ab95225D8',
    '0xeD472431e02Ea9EF8cC99B9812c335ac0873bba2',
    '0xa296F9474e77aE21f90afb50713F44Cc6916FbB2',
    '0x2e60ab79BbCdfea164874700D5d98969a386eB2a',
    '0x84B536dA1A2D9b0609f9Da73139674cc2D75AF2D',
    '0xE6dE666a80a357497A2cAB3A91F1c28dcAA1Eca4',
    '0xf2dd964AcF53ad8959540CceEFD9FeA13d4D0Eb1',
    '0xd31FFD05a41645631A22a64c1f870a6248A4DDcF',
    '0xA6F2408e3CD34084c37A0D88FED8C6b6490F7529',
    '0xd64370aeDbEbbAE04CfCaE27E8E0c5ecbD343336',
    '0x0029381eFF48E9eA963F8095eA204098ac8e44B5',
    '0x94183DD08FFAa595e43B104804d55eE95492C8cB',
    '0x10E5d5f598abb970F85456Ea59f0611D77E00168',
    '0xfd0824dF1E598D34C3495e1C2a339E2FA23Af40D',
    '0x76Ad5c64Fe6B26b6aD9aaAA19eBa00e9eCa31FE1',
    '0x5105d9De003fB7d22979cd0cE167Ab919E60900A',
    '0x255e7a0eB5aa1616781702203B042821C35394eF',
    '0x6F571bA11447136fC11BA9AC98f0f0233dAc1BFF',
    '0xeD617a06C6c727827Ca3B6fb3E565C68342c4c2b',
    '0xbD56b964FCdd208a7a83C291864eEb8271BaB773',
    '0x5d479aEbfc49b9e08860BbfCfb3BB4D768Aa1fc3',
    '0xC0B2D45b8617997bcDad0F33AEE03e4DF4C4f81E',
    '0x184949E5A7E8740Da20231B90Fd38E7725FA657A',
    '0x2DaE4d6Cccd824917cA783774C1e8854FF86951F',
    '0x62Da43b98a9338221cc36dDa40605B0F5eA0Ac2d',
    '0xB9cE09322FC55Da298e27b8678d300423988b40E',
    '0xDa959F3464FE2375f0B1f8A872404181931978B2',
    '0x05930052a9a1e2f14B0e6cCc726b60E06792fB67',
    '0x01bc14c7063212c8cAc269960bA875E58568E4fD',
    '0xac102f66A1670508DFA5753Fcbbba80E0648a0c7',
    '0x6cFdB5Ce2a26a5b07041618fDAD81273815c8bb4',
    '0xd43035F5Ef932E1335A664c707d85c54C924667e',
    '0x45cd033361E9fEF750AAea96DbC360B342F4b4a2',
    '0x12b493A6E4F185EF1feef45565654F71156C25bA',
    '0x716c19807f46F97DdAc0745878675fF5B3A75004',
    '0x437352A8E2394379521BC84f0874c66c94F32fbb',
    '0x676247D8729B728BEEa83d1c1314acDD937327b6',
    '0x30914Dbb452BeF7aD226aF0Aeb130658A4aC1Cb0',
    '0xfC04c452035A1E4D4fD4d5BF6b083CB563a20CA4',
    '0xA69057977211C7bAe847c72dF6338d1B71E838af',
    '0xAa01F80375528F36291677C683905b4A113A6470',
    '0x41d731926E5B8d3ba70Bb62B9f067A163bE706ab',
    '0xE4FED988974C0B7DFEB162287DeD67c6B197Af63',
    '0x0875e51e54fbb7e63b1819acb069dc8d684563eb',
    '0x6528DCc443B2e014185946d1Dc1efd6e9aBE4CD8',
    '0x55152E05202AE58fDab26b20c6Fd762F5BCA797c',
    '0x23855F21d158efAE410e3568FB623C35BC1952E0',
    '0xD6887808CfCd5cBFf867379e41FaC912F167b084',
    '0xFE6338BEBef1989afA225494A63f235D8e8f46fd',
    '0xc2ecb35624Ad941474371E696AC8DAd0dda5e4d5',
    '0x7ac007afB5d61F48D1E3C8Cc130d4cf6b765000e',
    '0x03a9091620CACeE4968c915232B175C16a584733',
    '0xE2510a1fCCCde8d2D1c40b41e8f71fB1F47E5bBA',
    '0x7216d1e173c1f1Ed990239d5c77d74714a837Cd5',
    '0x681047473B6145BA5dB90b074E32861549e85cC7',
    '0xEeEA1e815f12d344b5035a33da4bc383365F5Fee',
    '0x6356b24b36074AbE2903f44fE4019bc5864FDe36',
    '0x4B283e4211B3fAa525846d21869925e78f93f189',
    '0xe3103e565cF96a5709aE8e603B1EfB7fED04613B',
    '0xF344611DD94099708e508C2Deb16628578940d77',
    '0x4f74BbF6859A994e7c309eA0f11E3Cc112955110',
    '0xD4E49A8Ec23daB51ACa459D233e9447DE03AFd29',
    '0x633F4b4DB7dD4fa066Bd9949Ab627a551E0ecd32',
    '0x923E69322Bea5e22799a29Dcfc9c616F3B5cF95b',
    '0xFd9ACEc0F413cA05d5AD5b962F3B4De40018AD87',
    '0x3F91756D773A1455A7a1A70f5d9239F1B1d1f095',
    '0xc7D0E29b616B29aC6fF4FD5f37c8Da826D16DB0D',
    '0x269Ed6B2040f965D9600D0859F36951cB9F01460',
    '0x08B9A023e34Bad6Db868B699fa642Bf5f12Ebe76',
    '0x759ee0072901f409e4959E00b00a16FD729397eC',
    '0x12A33F6B0dd0D35279D402aB61587fE7eB23f7b0',
    '0x518B07E2d9e08A8c2e3cB7704336520827a4d399',
    '0x68a90C38bF4f90AC2a870d6FcA5b0A5A218763AD',
    '0x5b3Ed7f47D1d4FA22b559D043a09d78bc55A94E9',
    '0x76e404Ab7357fD97d4f1e8Dd52f298A035fd408c',
    '0x0A9773AEbc1429d860A492d70c8EA335fAa9F19f',
    '0x80E919784e7c5AD3Dd59cAfCDC0e9C079B65f262',
    '0x42ff9473a5AEa00dE39355e0288c7A151EB00B6e',
    '0x3A0eF6a586D9C15de30eDF5d34ae00E26b0125cE',
    '0x2bD42C357a3e13F18849C67e8dC108Cc8462ae33',
    '0x393fe4bc29AfbB3786D99f043933c49097449fA1',
    '0x07b34dAABcb75C9cbD0c8AEfbC0ed5E30845eF12',
    '0x73d1cC4B8dA555005E949B3ECEE490A7206C14DF',
    '0xe1314E6d436877850BB955Ac074226FCB0B8a86d',
    '0x6fa49bd916e392dc9264636b0b5Cf2beee652dA3',
    '0x95bD8FDb58692d343C89bC7bc435773779CC0e47',
    '0xb008e7AD32c710B07fb8D4453aBC79214Cd34891',
    '0x4c0650668A63EF468c7bDCd910A62287e9FC4d52',
    '0xEcF9b9aE88150F11cbf2263c69823e2ECb84F07B',
    '0x7C960e55C8119457528490C3a34C1438FaF6B039',
    '0xfcB0C53FC5c71005D11C6838922e254323b7Ca06',
];
const stakingContractAddresses = stakingContractAddressesV1;
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

        const stakingTokenContract = new web3.eth.Contract(ABI.PAIR, stakingTokenAddress);
        const rewardsTokenContract = new web3.eth.Contract(ABI.TOKEN, rewardsTokenAddress);

        const [
            stakingTokenSymbol0,
            stakingTokenSymbol1,
            rewardsTokenSymbol,
            rewardsTokenDecimals,
            currentRewardBalance,
        ] = await Promise.all([
            stakingTokenContract.methods.token0().call().then(token0 => Helpers.getSymbolCached(token0)),
            stakingTokenContract.methods.token1().call().then(token1 => Helpers.getSymbolCached(token1)),
            rewardsTokenContract.methods.symbol().call(),
            rewardsTokenContract.methods.decimals().call(),
            rewardsTokenContract.methods.balanceOf(stakingContractAddress).call(),
        ]);

        const stakingTokenSymbol = `${stakingTokenSymbol0}-${stakingTokenSymbol1}`;

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
            unclaimedReward: (unclaimedReward / (10 ** rewardsTokenDecimals)).toLocaleString(),
            remainingFunding: (activeFunding / (10 ** rewardsTokenDecimals)).toLocaleString(),
            rewardRate: (adjustedRewardRate / (10 ** rewardsTokenDecimals)).toLocaleString(undefined, {minimumFractionDigits: 5}),
            expires: (new Date(periodFinish * 1000)).toLocaleString(),
        });
        pid++;
    }

    console.table(table);
})();
