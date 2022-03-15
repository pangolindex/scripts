// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');
const CONSTANTS = require('../core/constants');
const { propose: gnosisMultisigPropose } = require('../core/gnosisMultisig');
const { propose: gnosisSafePropose } = require('../core/gnosisSafe');

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


const poolIds = farms.map(farm => farm.pid);
const allocationPoints = farms.map(farm => farm.weight);
const rewarderAddresses = farms.map(farm => farm.rewarder ?? ADDRESS.ZERO_ADDRESS); // Typically zero address
const overwriteStatuses = farms.map(farm => farm.overwrite ?? false); // Typically false

/*
 * This is an example of updating farm weights via the multisig
 */
(async () => {
    startingAvax = await web3.eth.getBalance(CONFIG.WALLET.ADDRESS);
    console.log(`Starting AVAX: ${startingAvax / (10 ** 18)}`);

    const miniChefContract = new web3.eth.Contract(ABI.MINICHEF_V2, miniChefAddress);

    if (showOverview) {
        const lpTokens = await miniChefContract.methods.lpTokens().call();
        const poolInfos = await miniChefContract.methods.poolInfos().call();

        const farmInfo = await Promise.all(lpTokens.map(async (pglAddress, i) => {
            if (!farms.some(farm => farm.pid === i)) return {};

            const pglContract = new web3.eth.Contract(ABI.PAIR, pglAddress);
            const [token0, token1] = await Promise.all([
                pglContract.methods.token0().call(),
                pglContract.methods.token1().call(),
            ]);

            const [token0Symbol, token1Symbol] = await Promise.all([
                new web3.eth.Contract(ABI.TOKEN, token0).methods.symbol().call(),
                new web3.eth.Contract(ABI.TOKEN, token1).methods.symbol().call(),
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
        console.log(`Updating ${farms.length} farms with a net weight change of ${netWeightDelta}`);

        console.log(`Pausing for 15 seconds ...`);
        await new Promise((resolve) => setTimeout(resolve, 15 * 1000));
    }

    const tx = miniChefContract.methods.setPools(
        poolIds,
        allocationPoints,
        rewarderAddresses,
        overwriteStatuses,
    );

    console.log(`Encoding bytecode ...`);
    const bytecode = tx.encodeABI();
    const fileOutput = `./${path.basename(__filename, '.js')}-bytecode.txt`;
    fs.writeFileSync(fileOutput, bytecode);
    console.log(`Encoded bytecode to ${fileOutput}`);
    console.log();

    if (bytecodeOnly) {
        console.log(`Skipping execution due to 'bytecodeOnly' config`);
        return;
    }

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
        console.log(`Ending AVAX: ${endingAvax / (10 ** 18)}`);
        console.log(`AVAX spent: ${(startingAvax - endingAvax) / (10 ** 18)}`);
        process.exit(0);
    });
