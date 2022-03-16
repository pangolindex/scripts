// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const BYTECODE = require('../../config/bytecode.json');
const ADDRESS = require('../../config/address.json');
const CONSTANTS = require('../core/constants');
const { propose: gnosisMultisigPropose } = require('../core/gnosisMultisig');
const { propose: gnosisSafePropose } = require('../core/gnosisSafe');
const conversion = require('../core/conversion');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
let startingAvax;
let endingAvax;


// Change These Variables
// --------------------------------------------------
const multisigAddress = ADDRESS.PANGOLIN_GNOSIS_SAFE_ADDRESS;
const multisigType = CONSTANTS.GNOSIS_SAFE;
const rewarders = [
    [{
        rewardAddress: '0x8729438eb15e2c8b576fcc6aecda6a148776c0f5',
        multiplier: 23.16497,
        funding: 1,
    }],
];
// --------------------------------------------------


/*
 * Deploy rewarders required for each SuperFarm
 */
verifyRewardersSyntax(rewarders);
(async () => {
    startingAvax = await web3.eth.getBalance(CONFIG.WALLET.ADDRESS);

    const rewarderViaMultiplierContract = new web3.eth.Contract(ABI.REWARDER_VIA_MULTIPLIER);

    for (const rewarder of rewarders) {
        ////////////////////////////////////////
        // Step 1: Deploy rewarder via EOA
        ////////////////////////////////////////

        const rewardAddressArguments = [];
        const rewardMultiplierArguments = [];
        const rewardFundingAmounts = [];
        const rewardSymbols = [];

        for (const reward of rewarder) {
            const rewardContract = new web3.eth.Contract(ABI.TOKEN, reward.rewardAddress.toLowerCase());
            const [ symbol, decimals ] = await Promise.all([
                rewardContract.methods.symbol().call(),
                rewardContract.methods.decimals().call(),
            ]);

            rewardSymbols.push(symbol);
            rewardAddressArguments.push(reward.rewardAddress.toLowerCase());

            const adjustedMultiplier = conversion.convertFloatToString(reward.multiplier, parseInt(decimals));
            rewardMultiplierArguments.push(adjustedMultiplier);

            const adjustedFunding = conversion.convertFloatToString(reward.funding, parseInt(decimals));
            rewardFundingAmounts.push(adjustedFunding);
        }

        console.table(rewarder.map((r, i) => ({
            reward: rewardSymbols[i],
            multiplier: r.multiplier,
            adjustedMultiplier: rewardMultiplierArguments[i],
            funding: r.funding,
            adjustedFunding: rewardFundingAmounts[i],
        })));

        console.log(`Pausing for 15 seconds ...`);
        await new Promise(resolve => setTimeout(resolve, 15 * 1000));

        const deployTx = rewarderViaMultiplierContract.deploy({
            data: BYTECODE.REWARDER_VIA_MULTIPLIER,
            arguments: [
                rewardAddressArguments,
                rewardMultiplierArguments,
                18,
                ADDRESS.PANGOLIN_MINICHEF_V2_ADDRESS,
            ],
        });

        const baseGasPrice = await web3.eth.getGasPrice();
        const gas = await deployTx.estimateGas({ from: CONFIG.WALLET.ADDRESS });

        console.log(`Deploying rewarder with ${rewardAddressArguments.length} additional rewards (${rewardSymbols.join(',')}) ...`)

        const { _address: rewarderAddress } = await deployTx.send({
            from: CONFIG.WALLET.ADDRESS,
            gas,
            maxFeePerGas: baseGasPrice * 2,
            maxPriorityFeePerGas: web3.utils.toWei('2', 'nano'),
        });

        console.log(`Deployed rewarder at ${rewarderAddress}`);


        ////////////////////////////////////////
        // Step 2: Fund rewarders via multisig
        ////////////////////////////////////////

        for (const [i, reward] of rewarder.entries()) {
            if (parseInt(rewardFundingAmounts[i]) === 0) continue;

            const rewardContract = new web3.eth.Contract(ABI.TOKEN, reward.rewardAddress.toLowerCase());

            const fundingTx = rewardContract.methods.transfer(
                rewarderAddress,
                rewardFundingAmounts[i],
            );

            console.log(`Proposing tx to fund rewarder with ${reward.funding.toLocaleString()} ${rewardSymbols[i]} ...`);

            switch (multisigType) {
                case CONSTANTS.GNOSIS_MULTISIG:
                    const receipt = await gnosisMultisigPropose({
                        multisigAddress,
                        destination: rewardContract._address,
                        value: 0,
                        bytecode: fundingTx.encodeABI(),
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
                        multisigAddress,
                        destination: rewardContract._address,
                        value: 0,
                        bytecode: fundingTx.encodeABI(),
                    });
                    break;
                default:
                    throw new Error(`Unknown multisig type: ${multisigType}`);
            }
        }
        console.log();
    }
})()
    .catch(console.error)
    .finally(async () => {
        endingAvax = await web3.eth.getBalance(CONFIG.WALLET.ADDRESS);
        console.log(`AVAX spent: ${(startingAvax - endingAvax) / (10 ** 18)}`);
        process.exit(0);
    });

function verifyRewardersSyntax(rewarders) {
    if (!Array.isArray(rewarders)) {
        throw new Error(`Invalid rewarders syntax. Expected an array`);
    }

    for (const rewarder of rewarders) {
        if (!Array.isArray(rewarder)) {
            throw new Error(`Invalid rewarder syntax. Expected an array`);
        }

        for (const reward of rewarder) {
            if (typeof reward !== 'object') {
                throw new Error(`Invalid reward syntax. Expected an object`);
            }

            if (reward.rewardAddress === undefined) {
                throw new Error(`Missing reward key: 'rewardAddress'`);
            }
            if (typeof reward.rewardAddress !== 'string') {
                throw new Error(`Invalid 'rewardAddress' value: ${reward.rewardAddress}`);
            }
            if (!web3.utils.isAddress(reward.rewardAddress.toLowerCase())) {
                throw new Error(`Reward 'rewardAddress' must be an address`);
            }

            if (reward.multiplier === undefined) {
                throw new Error(`Missing reward key: 'multiplier'`);
            }
            if (typeof reward.multiplier !== 'number') {
                throw new Error(`Invalid 'multiplier' value: ${reward.multiplier}`);
            }
            if (isNaN(reward.multiplier)) {
                throw new Error(`Reward 'multiplier' must be a valid number`);
            }
            if (reward.multiplier === 0) {
                throw new Error(`Reward 'multiplier' cannot be zero`);
            }
            if (reward.multiplier < 0) {
                throw new Error(`Reward 'multiplier' must be a positive number`);
            }

            if (reward.funding === undefined) {
                throw new Error(`Missing reward key: 'funding'`);
            }
            if (typeof reward.funding !== 'number') {
                throw new Error(`Invalid 'funding' value: ${reward.funding}`);
            }
            if (isNaN(reward.funding)) {
                throw new Error(`Reward 'funding' must be a valid number`);
            }
            if (reward.funding < 0) {
                throw new Error(`Reward 'funding' must be a positive number`);
            }
        }
    }
}
