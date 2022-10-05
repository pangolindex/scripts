// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const MiniChefV2 = require('@pangolindex/exchange-contracts/artifacts/contracts/mini-chef/MiniChefV2.sol/MiniChefV2.json');
const PangolinPair = require('@pangolindex/exchange-contracts/artifacts/contracts/pangolin-core/PangolinPair.sol/PangolinPair.json');
const ADDRESS = require('../../config/address.json');
const CONSTANTS = require('../core/constants');
const { propose: gnosisMultisigPropose } = require('../core/gnosisMultisig');
const { propose: gnosisSafePropose } = require('../core/gnosisSafe');
const Helpers = require('../core/helpers');

const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
let gasSpent = web3.utils.toBN(0);

// Change These Variables
// --------------------------------------------------
const miniChefAddress = ADDRESS.PANGOLIN_MINICHEF_V2_ADDRESS;
const multisigAddress = ADDRESS.PANGOLIN_GNOSIS_SAFE_ADDRESS;
const multisigType = CONSTANTS.GNOSIS_SAFE;
const showOverview = true;
const bytecodeOnly = false;
const farms = [
    {
        pgl: '0x0000000000000000000000000000000000000000',
        weight: 100,
        // rewarder: '0x0000000000000000000000000000000000000000',
    }
];
// --------------------------------------------------


const pglAddresses = farms.map(farm => farm.pgl).map(Helpers.toChecksumAddress);
const allocationPoints = farms.map(farm => farm.weight).map(weight => parseInt(weight));
const rewarderAddresses = farms.map(farm => farm.rewarder ?? ADDRESS.ZERO_ADDRESS).map(Helpers.toChecksumAddress);

/*
 * Add farms via the multisig
 */
verifyFarmsSyntax(farms);
(async () => {
    const miniChefContract = new web3.eth.Contract(MiniChefV2.abi, miniChefAddress.toLowerCase());

    if (showOverview) {
        const tokenInfo = await Promise.all(pglAddresses.map(async (pglAddress) => {
            const pglContract = new web3.eth.Contract(PangolinPair.abi, pglAddress);
            const [token0Symbol, token1Symbol] = await Promise.all([
                pglContract.methods.token0().call().then(Helpers.getSymbolCached),
                pglContract.methods.token1().call().then(Helpers.getSymbolCached),
            ]);

            return {
                token0Symbol,
                token1Symbol,
            };
        }));

        let weightDelta = 0;

        const table = farms.map((farm, i) => {
            weightDelta += allocationPoints[i];
            return {
                'Farm': `${tokenInfo[i].token0Symbol}-${tokenInfo[i].token1Symbol}`,
                'Weight': allocationPoints[i],
                'Rewarder': rewarderAddresses[i],
            };
        });

        console.table(table);
        console.log(`Parsed changes to add ${farms.length} ${farms.length === 1 ? 'farm' : 'farms'} with a net weight change of ${weightDelta}`);

        if (!bytecodeOnly) {
            console.log(`Pausing for 15 seconds ...`);
            await new Promise((resolve) => setTimeout(resolve, 15 * 1000));
        }
    }

    const tx = miniChefContract.methods.addPools(
        allocationPoints,
        pglAddresses,
        rewarderAddresses,
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

    console.log(`Proposing tx to add ${farms.length} farms ...`);

    switch (multisigType) {
        case CONSTANTS.GNOSIS_MULTISIG:
            const receipt = await gnosisMultisigPropose({
                multisigAddress,
                destination: miniChefAddress,
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
        console.log(`Gas spent: ${gasSpent / (10 ** 18)}`);
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

        if (farm.pgl === undefined) {
            throw new Error(`Missing farm key: 'pgl'`);
        }
        if (typeof farm.pgl !== 'string') {
            throw new Error(`Invalid 'pgl' value: ${farm.pgl}`);
        }
        if (!web3.utils.isAddress(farm.pgl.toLowerCase())) {
            throw new Error(`Farm 'pgl' must be an address`);
        }
        if (farm.pgl === ADDRESS.ZERO_ADDRESS) {
            throw new Error(`Farm 'pgl' cannot be the zero address`);
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
    }
}
