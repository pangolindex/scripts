// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');
const CONSTANTS = require('../core/constants');
const { propose: gnosisMultisigPropose } = require('../core/gnosisMultisig');
const { propose: gnosisSafePropose } = require('../core/gnosisSafe');
const helpers = require('../core/helpers');

const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
let startingAvax;
let endingAvax;

// Change These Variables
// --------------------------------------------------
const miniChefAddress = ADDRESS.PANGOLIN_MINICHEF_V2_ADDRESS;
const multisigAddress = ADDRESS.PANGOLIN_GNOSIS_SAFE_ADDRESS;
const multisigType = CONSTANTS.GNOSIS_SAFE;
const showOverview = true;
const bytecodeOnly = false;
const farms = [
    {
        pid: 1,
        weight: 0,
        // rewarder: '0x0000000000000000000000000000000000000000',
        // overwrite: false,
    }
];
// --------------------------------------------------


const poolIds = farms.map(farm => farm.pid).map(pid => parseInt(pid));
const allocationPoints = farms.map(farm => farm.weight).map(weight => parseInt(weight));
const rewarderAddresses = farms.map(farm => farm.rewarder ?? ADDRESS.ZERO_ADDRESS).map(helpers.toChecksumAddress);
const overwriteStatuses = farms.map(farm => farm.overwrite ?? false);

/*
 * Update farm weights and rewarders via the multisig
 */
verifyFarmsSyntax(farms);
(async () => {
    startingAvax = await web3.eth.getBalance(CONFIG.WALLET.ADDRESS);

    const miniChefContract = new web3.eth.Contract(ABI.MINICHEF_V2, miniChefAddress);

    if (showOverview) {
        const [ lpTokens, poolInfos ] = await Promise.all([
            miniChefContract.methods.lpTokens().call(),
            miniChefContract.methods.poolInfos().call(),
        ]);

        const farmInfo = await Promise.all(lpTokens.map(async (pglAddress, i) => {
            if (!farms.some(farm => farm.pid === i)) return {};

            const pglContract = new web3.eth.Contract(ABI.PAIR, pglAddress);
            const [token0Symbol, token1Symbol] = await Promise.all([
                pglContract.methods.token0().call().then(helpers.getSymbolCached),
                pglContract.methods.token1().call().then(helpers.getSymbolCached),
            ]);

            return {
                token0Symbol,
                token1Symbol,
            };
        }));

        let netWeightDelta = 0;

        const table = farms.map(({ pid, weight }) => {
            const weightDelta = weight - parseInt(poolInfos[pid].allocPoint);
            netWeightDelta += weightDelta;
            return {
                pid: pid,
                'Farm': `${farmInfo[pid].token0Symbol}-${farmInfo[pid].token1Symbol}`,
                'Old Weight': parseInt(poolInfos[pid].allocPoint),
                'New Weight': weight,
                'Delta Weight': weightDelta,
            };
        });

        console.table(table);
        console.log(`Parsed changes to update ${farms.length} ${farms.length === 1 ? 'farm' : 'farms'} with a net weight change of ${netWeightDelta}`);

        if (!bytecodeOnly) {
            console.log(`Pausing for 15 seconds ...`);
            await new Promise((resolve) => setTimeout(resolve, 15 * 1000));
        }
    }

    const tx = miniChefContract.methods.setPools(
        poolIds,
        allocationPoints,
        rewarderAddresses,
        overwriteStatuses,
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

    console.log(`Proposing tx to update ${farms.length} farms ...`);

    switch (multisigType) {
        case CONSTANTS.GNOSIS_MULTISIG:
            const receipt = await gnosisMultisigPropose({
                multisigAddress,
                destination: miniChefAddress,
                value: 0,
                bytecode,
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
                destination: miniChefAddress,
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
        endingAvax = await web3.eth.getBalance(CONFIG.WALLET.ADDRESS);
        console.log(`AVAX spent: ${(startingAvax - endingAvax) / (10 ** 18)}`);
        process.exit(0);
    });


function verifyFarmsSyntax(farms) {
    if (!Array.isArray(farms)) {
        throw new Error(`Invalid farms syntax. Expected an array`);
    }

    for (const farm of farms) {
        if (typeof farm !== 'object') {
            throw new Error(`Invalid farm syntax. Expected an object`);
        }

        if (farm.pid === undefined) {
            throw new Error(`Missing farm key: 'pid'`);
        }
        if (typeof farm.pid !== 'number') {
            throw new Error(`Invalid 'pid' value: ${farm.pid}`);
        }
        if (isNaN(farm.pid)) {
            throw new Error(`Farm 'pid' must be a valid number`);
        }
        if (!Number.isInteger(farm.pid)) {
            throw new Error(`Farm 'pid' must be a valid integer`);
        }
        if (farm.pid < 0) {
            throw new Error(`Farm 'pid' must be a positive number`);
        }

        if (farm.weight === undefined) {
            throw new Error(`Missing farm key: 'weight'`);
        }
        if (typeof farm.weight !== 'number') {
            throw new Error(`Invalid 'weight' value: ${farm.weight}`);
        }
        if (isNaN(farm.weight)) {
            throw new Error(`Farm 'weight' must be a valid number`);
        }
        if (!Number.isInteger(farm.weight)) {
            throw new Error(`Farm 'weight' must be a valid integer`);
        }
        if (farm.weight < 0) {
            throw new Error(`Farm 'weight' must be a positive number`);
        }

        if (farm.rewarder !== undefined) {
            if (typeof farm.rewarder !== 'string') {
                throw new Error(`Invalid 'rewarder' value: ${farm.rewarder}`);
            }
            if (!web3.utils.isAddress(farm.rewarder.toLowerCase())) {
                throw new Error(`Farm 'rewarder' must be an address`);
            }
        }

        if (farm.overwrite !== undefined) {
            if (typeof farm.overwrite !== 'boolean') {
                throw new Error(`Invalid 'overwrite' value: ${farm.overwrite}`);
            }
        }
    }
}
