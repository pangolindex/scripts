// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ADDRESS = require('../../config/address.json');
const ABI = require('../../config/abi.json');
const PangolinRouterSupportingFees = require('@pangolindex/exchange-contracts/artifacts/contracts/pangolin-periphery/PangolinRouterSupportingFees.sol/PangolinRouterSupportingFees.json');
const CONSTANTS = require('../core/constants');
const Conversion = require('../core/conversion');
const Helpers = require('../core/helpers');
const { propose: gnosisMultisigPropose } = require('../core/gnosisMultisig');
const { propose: gnosisSafePropose } = require('../core/gnosisSafe');
const path = require('path');
const fs = require('fs');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
let gasSpent = web3.utils.toBN(0);


// Change These Variables
// --------------------------------------------------
const tokenAddresses = [
    '0x0000000000000000000000000000000000000000',
];
const routerSupportingFeesAddress = ADDRESS.DAAS_ROUTER_MAINNET;
const multisigAddress = ADDRESS.PANGOLIN_GNOSIS_SAFE_ADDRESS;
const multisigType = CONSTANTS.GNOSIS_SAFE;
const recipientAddress = multisigAddress;
const bytecodeOnly = false;
// --------------------------------------------------


(async () => {
    const routerSupportingFeesContract = new web3.eth.Contract(PangolinRouterSupportingFees.abi, routerSupportingFeesAddress.toLowerCase());

    const tokenBalances = [];
    const tokenBalancesTable = [];

    // Get token information
    for (const tokenAddress of tokenAddresses) {
        const tokenContract = new web3.eth.Contract(ABI.TOKEN, tokenAddress);
        const [ balance, decimals, symbol ] = await Promise.all([
            tokenContract.methods.balanceOf(routerSupportingFeesAddress).call().then(web3.utils.toBN),
            tokenContract.methods.decimals().call(),
            tokenContract.methods.symbol().call(),
        ]);

        tokenBalances.push(balance);
        tokenBalancesTable.push({
            symbol: symbol,
            address: tokenAddress,
            balance: Conversion.convertBNtoFloat(balance, decimals).toLocaleString(),
        });
    }

    console.log(`Withdrawal overview:`);
    console.table(tokenBalancesTable);

    // Verify withdrawal amounts are non-zero
    const tokenAddressesWithZeroBalance = tokenBalances.filter(bal => bal.isZero());
    if (tokenAddressesWithZeroBalance.length > 0) {
        throw new Error(`Tokens must have a non-zero balance: [${tokenAddressesWithZeroBalance.join(',')}]`);
    }

    const tx = routerSupportingFeesContract.methods.withdrawFees(
        tokenAddresses.map(address => address.toLowerCase()),
        tokenBalances.map(balance => balance.toString()),
        recipientAddress.toLowerCase(),
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

    console.log(`Pausing for 10 seconds ...`);
    await Helpers.sleep(10 * 1000);

    console.log(`Proposing tx to withdraw fees for ${tokenAddresses.length} tokens ...`);

    switch (multisigType) {
        case CONSTANTS.GNOSIS_MULTISIG:
            const receipt = await gnosisMultisigPropose({
                multisigAddress,
                destination: routerSupportingFeesAddress,
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
                destination: routerSupportingFeesAddress,
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
