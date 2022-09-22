const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');
const CONSTANTS = require('../core/constants');
const { propose: gnosisMultisigPropose } = require('../core/gnosisMultisig');
const { propose: gnosisSafePropose } = require('../core/gnosisSafe');

const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
let gasSpent = web3.utils.toBN(0);

// Change These Variables
// --------------------------------------------------
const pangoChefAddress = ADDRESS.SONGBIRD_PANGO_CHEF;
const multisigAddress = ADDRESS.SONGBIRD_GNOSIS_MULTISIG_ADDRESS;
const multisigType = CONSTANTS.GNOSIS_MULTISIG;
const bytecodeOnly = false;
const pools = [
    {
        pid: 0,
        rewarder: '0x0000000000000000000000000000000000000000',
    }
];
// --------------------------------------------------


/*
 * Add/change rewarder via the multisig
 */
verifyPoolsSyntax(pools);
(async () => {
    const pangoChefContract = new web3.eth.Contract(ABI.PANGO_CHEF, pangoChefAddress);

    for (const [i, pool] of pools.entries()) {
        const tx = pangoChefContract.methods.setRewarder(
            pool.pid,
            pool.rewarder,
        );

        console.log(`Encoding bytecode ...`);
        const bytecode = tx.encodeABI();
        const fileName = path.basename(__filename, '.js');
        const fileOutput = path.join(__dirname, `${fileName}-${pool.pid}-${pool.rewarder}-bytecode.txt`);
        fs.writeFileSync(fileOutput, bytecode);
        console.log(`Encoded bytecode to ${fileOutput}`);
        console.log();

        if (bytecodeOnly) {
            console.log(`Skipping execution due to 'bytecodeOnly' config`);
            continue;
        }

        console.log(`Proposing tx to set pool #${pool.pid} rewarder (${i+1}/${pools.length}) ...`);

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

        if (pool.rewarder === undefined) {
            throw new Error(`Missing pool key: 'rewarder'`);
        }
        if (typeof pool.rewarder !== 'string') {
            throw new Error(`Invalid 'rewarder' value: ${pool.rewarder}`);
        }
        if (!web3.utils.isAddress(pool.rewarder.toLowerCase())) {
            throw new Error(`Pool 'rewarder' must be an address`);
        }
    }

    if (pools.map(({pid}) => pid).some((pid, i, pids) => pids.indexOf(pid) !== i)) {
        throw new Error(`Duplicate pid found`);
    }
}
