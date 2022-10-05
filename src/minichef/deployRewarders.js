// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const BYTECODE = require('../../config/bytecode.json');
const ADDRESS = require('../../config/address.json');
const CONSTANTS = require('../core/constants');
const RewarderViaMultiplier = require('@pangolindex/exchange-contracts/artifacts/contracts/mini-chef/RewarderViaMultiplier.sol/RewarderViaMultiplier.json');
const { propose: gnosisMultisigPropose } = require('../core/gnosisMultisig');
const { propose: gnosisSafePropose } = require('../core/gnosisSafe');
const Helpers = require('../core/helpers');
const conversion = require('../core/conversion');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
let gasSpent = web3.utils.toBN(0);


// Change These Variables
// --------------------------------------------------
const miniChefAddress = ADDRESS.PANGOLIN_MINICHEF_V2_ADDRESS;
const multisigAddress = ADDRESS.PANGOLIN_SUPER_FARM_GNOSIS_SAFE_ADDRESS;
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
    const rewarderViaMultiplierContract = new web3.eth.Contract(
        RewarderViaMultiplier.abi,
        undefined,
        { data: BYTECODE.REWARDER_VIA_MULTIPLIER }, // Using this instead of `RewarderViaMultiplier.bytecode` to include 2000 optimization runs
    );

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
        await Helpers.sleep(15 * 1000);

        const deployTx = rewarderViaMultiplierContract.deploy({
            arguments: [
                rewardAddressArguments,
                rewardMultiplierArguments,
                18,
                miniChefAddress,
            ],
        });

        const baseGasPrice = await web3.eth.getGasPrice();
        const gas = await deployTx.estimateGas({ from: CONFIG.WALLET.ADDRESS });

        console.log(`Deploying rewarder with ${rewardAddressArguments.length} additional rewards (${rewardSymbols.join(',')}) ...`)

        const { contractAddress: rewarderAddress, ...receipt } = await new Promise((resolve, reject) => {
            deployTx.send({
                from: CONFIG.WALLET.ADDRESS,
                gas,
                maxFeePerGas: baseGasPrice * 2,
                maxPriorityFeePerGas: web3.utils.toWei('1', 'nano'),
            })
                .once('receipt', resolve)
                .once('error', reject);
        });

        gasSpent.iadd(web3.utils.toBN(receipt.effectiveGasPrice).mul(web3.utils.toBN(receipt.gasUsed)));

        console.log(`Deployed rewarder at ${rewarderAddress}`);


        ////////////////////////////////////////
        // Step 2: Fund rewarders via multisig
        ////////////////////////////////////////

        for (const [i, reward] of rewarder.entries()) {
            if (parseInt(rewardFundingAmounts[i]) === 0) continue;

            const rewardContract = new web3.eth.Contract(ABI.TOKEN, reward.rewardAddress.toLowerCase());

            const currentRewardBalance = await rewardContract.methods.balanceOf(multisigAddress).call().then(web3.utils.toBN);
            if (currentRewardBalance.lt(web3.utils.toBN(rewardFundingAmounts[i]))) {
                console.log(`Insufficient ${rewardSymbols[i]} balance for funding!`);
                console.log(`Will propose funding tx anyway in 10 seconds ...`);
                await Helpers.sleep(10 * 1000);
            }

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

                    gasSpent.iadd(web3.utils.toBN(receipt.effectiveGasPrice).mul(web3.utils.toBN(receipt.gasUsed)));

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
        console.log(`Gas spent: ${gasSpent / (10 ** 18)}`);
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
