const CONFIG = require('../../config/config');
const ADDRESS = require('../../config/address.json');
const CONSTANTS = require('../core/constants');
const PangoChef = require('@pangolindex/exchange-contracts/artifacts/contracts/staking-positions/PangoChef.sol/PangoChef.json');
const { propose: gnosisMultisigPropose } = require('../core/gnosisMultisig');
const { propose: gnosisSafePropose } = require('../core/gnosisSafe');
const Helpers = require('../core/helpers');
const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));
let gasSpent = web3.utils.toBN(0);

// Change These Variables
// --------------------------------------------------
const pangoChefAddress = ADDRESS.SONGBIRD_PANGO_CHEF;
const multisigAddress = ADDRESS.SONGBIRD_GNOSIS_MULTISIG_ADDRESS;
const multisigType = CONSTANTS.GNOSIS_MULTISIG;
const showOverview = true;
const bytecodeOnly = false;
const pools = [
    {
        pid: 0,
        weight: 100,
    }
];
// --------------------------------------------------


/*
 * Update pool weights via the multisig
 */
verifyPoolsSyntax(pools);
(async () => {
    const pangoChefContract = new web3.eth.Contract(PangoChef.abi, pangoChefAddress.toLowerCase());

    const poolIds = pools.map(({pid}) => pid);
    const weights = pools.map(({weight}) => weight);

    if (showOverview) {
        const poolInfos = await Promise.all(
            poolIds.map(poolId => pangoChefContract.methods.pools(poolId).call())
        );

        const poolRewardInfos = await Promise.all(
            poolIds.map(poolId => pangoChefContract.methods.poolRewardInfos(poolId).call())
        );

        const recipientSymbols = await Promise.all(
            poolInfos.map(({tokenOrRecipient}) => Helpers.getPairTokenSymbolsCached(tokenOrRecipient))
        );

        let netWeightDelta = 0;

        const table = pools.map(({ pid, weight }, i) => {
            const weightDelta = weight - parseInt(poolRewardInfos[i].weight);
            netWeightDelta += weightDelta;
            return {
                pid: pid,
                'Pool': `${recipientSymbols[i][0]}-${recipientSymbols[i][1]}`,
                'Old Weight': parseInt(poolRewardInfos[i].weight),
                'New Weight': weight,
                'Delta Weight': weightDelta,
            };
        });

        console.table(table);
        console.log(`Parsed changes to update ${pools.length} ${pools.length === 1 ? 'pool' : 'pools'} with a net weight change of ${netWeightDelta}`);

        if (!bytecodeOnly) {
            console.log(`Pausing for 15 seconds ...`);
            await new Promise((resolve) => setTimeout(resolve, 15 * 1000));
        }
    }

    const tx = pangoChefContract.methods.setWeights(
        poolIds,
        weights,
    );

    console.log(`Encoding bytecode ...`);
    const bytecode = tx.encodeABI();
    const fileName = path.basename(__filename, '.js');
    const fileOutput = path.join(__dirname, `${fileName}-bytecode.txt`);
    fs.writeFileSync(fileOutput, bytecode);
    console.log(`Encoded bytecode to ${fileOutput}`);
    console.log();

    if (bytecodeOnly) {
        console.log(`Skipping execution due to 'bytecodeOnly' config`);
        return;
    }

    console.log(`Proposing tx to update ${pools.length} pools ...`);

    switch (multisigType) {
        case CONSTANTS.GNOSIS_MULTISIG:
            const receipt = await gnosisMultisigPropose({
                multisigAddress,
                destination: pangoChefAddress,
                value: 0,
                bytecode,
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
                destination: pangoChefAddress,
                value: 0,
                bytecode,
            });
            break;
        default:
            throw new Error(`Unknown multisig type: ${multisigType}`);
    }
})()
    .catch(console.error)
    .finally(async () => {
        console.log(`Gas spent: ${gasSpent / (10 ** 18)}`);
        process.exit(0);
    });


function verifyPoolsSyntax(pools) {
    if (!Array.isArray(pools)) {
        throw new Error(`Invalid pools syntax. Expected an array`);
    }

    for (const pool of pools) {
        if (typeof pool !== 'object') {
            throw new Error(`Invalid pool syntax. Expected an object`);
        }

        if (pool.pid === undefined) {
            throw new Error(`Missing pool key: 'pid'`);
        }
        if (typeof pool.pid !== 'number') {
            throw new Error(`Invalid 'pid' value: ${pool.pid}`);
        }
        if (isNaN(pool.pid)) {
            throw new Error(`Pool 'pid' must be a valid number`);
        }
        if (!Number.isInteger(pool.pid)) {
            throw new Error(`Pool 'pid' must be a valid integer`);
        }
        if (pool.pid < 0) {
            throw new Error(`Pool 'pid' must be a positive number`);
        }

        if (pool.weight === undefined) {
            throw new Error(`Missing pool key: 'weight'`);
        }
        if (typeof pool.weight !== 'number') {
            throw new Error(`Invalid 'weight' value: ${pool.weight}`);
        }
        if (isNaN(pool.weight)) {
            throw new Error(`Pool 'weight' must be a valid number`);
        }
        if (!Number.isInteger(pool.weight)) {
            throw new Error(`Pool 'weight' must be a valid integer`);
        }
        if (pool.weight < 0) {
            throw new Error(`Pool 'weight' must be a positive number`);
        }
    }

    if (pools.map(({pid}) => pid).some((pid, i, pids) => pids.indexOf(pid) !== i)) {
        throw new Error(`Duplicate pid found`);
    }
}
