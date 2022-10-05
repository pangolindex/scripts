const CONFIG = require('../../config/config');
const ADDRESS = require('../../config/address.json');
const { PoolType, ...CONSTANTS } = require('../core/constants');
const PangoChef = require('@pangolindex/exchange-contracts/artifacts/contracts/staking-positions/PangoChef.sol/PangoChef.json');
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
        recipient: '0x0000000000000000000000000000000000000001',
        type: PoolType.ERC20_POOL,
    }
];
// --------------------------------------------------


/*
 * Initialize pool via the multisig
 */
verifyPoolsSyntax(pools);
(async () => {
    const pangoChefContract = new web3.eth.Contract(PangoChef.abi, pangoChefAddress.toLowerCase());

    for (const [i, pool] of pools.entries()) {
        const tx = pangoChefContract.methods.initializePool(
            pool.recipient,
            pool.type,
        );

        console.log(`Encoding bytecode ...`);
        const bytecode = tx.encodeABI();
        const fileName = path.basename(__filename, '.js');
        const fileOutput = path.join(__dirname, `${fileName}-${pool.recipient}-bytecode.txt`);
        fs.writeFileSync(fileOutput, bytecode);
        console.log(`Encoded bytecode to ${fileOutput}`);
        console.log();

        if (bytecodeOnly) {
            console.log(`Skipping execution due to 'bytecodeOnly' config`);
            continue;
        }

        console.log(`Proposing tx to initialize ${pool.recipient} pool (${i+1}/${pools.length}) ...`);

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

        if (pool.recipient === undefined) {
            throw new Error(`Missing pool key: 'recipient'`);
        }
        if (typeof pool.recipient !== 'string') {
            throw new Error(`Invalid 'recipient' value: ${pool.recipient}`);
        }
        if (!web3.utils.isAddress(pool.recipient.toLowerCase())) {
            throw new Error(`Pool 'recipient' must be an address`);
        }
        if (pool.recipient === ADDRESS.ZERO_ADDRESS) {
            throw new Error(`Pool 'recipient' cannot be the zero address`);
        }

        if (pool.type === undefined) {
            throw new Error(`Missing pool key: 'type'`);
        }
        if (typeof pool.type !== 'number') {
            throw new Error(`Invalid 'type' value: ${pool.type}`);
        }
        if (isNaN(pool.type)) {
            throw new Error(`Pool 'type' must be a valid number`);
        }
        if (!Number.isInteger(pool.type)) {
            throw new Error(`Pool 'type' must be a valid integer`);
        }
        if (!Object.values(PoolType).includes(pool.type)) {
            throw new Error(`Pool 'type' is invalid`);
        }
    }

    if (pools.map(({recipient}) => recipient).some((recipient, i, recipients) => recipients.indexOf(recipient) !== i)) {
        throw new Error(`Duplicate recipient found`);
    }
}
