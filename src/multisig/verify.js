// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ADDRESS = require('../../config/address.json');
const ABI = require('../../config/abi.json');
const CONSTANTS = require('../core/constants');
const Helper = require('../core/helpers');
const { verify: gnosisMultisigVerify } = require('../core/gnosisMultisig');

const chalk = require('chalk');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));


// Change These Variables
// --------------------------------------------------
const IDs = Helper.createArrayOfNumbers(0, 1); // Note: Range is inclusive
const multisigAddress = ADDRESS.SONGBIRD_GNOSIS_MULTISIG_ADDRESS;
const multisigType = CONSTANTS.GNOSIS_MULTISIG;
const showRawOverview = true;
const showConfirmingAddresses = true;

const additionalAbis = [
    // [{"inputs":[],"name":"functionName","outputs":[],"stateMutability":"nonpayable","type":"function"}],
];
const additionalAddresses = {
    // FRIENDLY_NAME: '0xADDRESS',
};
// --------------------------------------------------


/*
 * This is an example of verifying a set of multisig transactions
 */
(async () => {
    const abiOptions = [].concat(...Object.values(ABI)).concat(...additionalAbis);
    const addressOptions = { ...ADDRESS, ...additionalAddresses };
    const methods = abiOptions
      .filter(entry => entry?.type === 'function')
      .map(({name, inputs}) => {
          const types = inputs.map(({type}) => type);
          const signature = `${name}(${types.join(',')})`;
          const encodedSignature = web3.eth.abi.encodeFunctionSignature(signature);
          return { name, types, signature, encodedSignature };
      });

    for (const id of IDs) {
        console.log();
        switch (multisigType) {
            case CONSTANTS.GNOSIS_MULTISIG:
                const { destination, value, data, executed, confirmations, required, gasEstimate } = await gnosisMultisigVerify({
                    multisigAddress,
                    id,
                });

                if (!data) {
                    console.error(`Invalid transaction ${id}`);
                    continue;
                }

                const methodSignature = data.slice(0, 10);
                const methodData = data.slice(10);

                const i = methods.findIndex(method => method.encodedSignature === methodSignature);

                if (i >= 0) {
                    const decodedParams = web3.eth.abi.decodeParameters(methods[i].types, methodData);
                    delete decodedParams.__length__;
                    const paramsRaw = Object.values(decodedParams).map(param => {
                        if (Array.isArray(param)) {
                            return `[${param.join(',')}]`;
                        }
                        return param;
                    });
                    const paramsFriendly = Object.values(decodedParams).map(param => {
                        if (Web3.utils.isAddress(param)) {
                            return getFriendlyAddress(param, addressOptions);
                        }
                        if (Array.isArray(param)) {
                            return `[${param.join(',')}]`;
                        }
                        return param;
                    });
                    const addressFriendly = getFriendlyAddress(destination, addressOptions);
                    const txFriendly = `${addressFriendly}.${methods[i].name}${value > 0 ? '{ value: '+value+' }' : ''}(${paramsFriendly.join(', ')})`;
                    const txRaw = `${destination}.${methods[i].name}${value > 0 ? '{ value: '+value+' }' : ''}(${paramsRaw.join(', ')})`;

                    const confirmationsString = confirmations.length >= required
                        ? chalk.green(`${confirmations.length}/${required}`)
                        : chalk.yellow(`${confirmations.length}/${required}`);
                    const friendlyColoredConfirmations = confirmations.map(confirmation => getFriendlyColoredConfirmation(confirmation, addressOptions));

                    console.log(`Transaction ${id}`);
                    console.log(`Friendly:      ${txFriendly}`);
                    if (showRawOverview) console.log(`Raw:           ${txRaw}`);
                    console.log(`Confirmations: ${confirmationsString} ${showConfirmingAddresses ? `[${friendlyColoredConfirmations}]` : ``}`);
                    console.log(`Executed:      ${executed ? chalk.green(executed) : chalk.yellow(executed)}`);
                    if (confirmations.length >= required && !executed) {
                        console.log(`Execution gas estimation: ${gasEstimate ?? 'ERROR'}`);
                    }
                } else {
                    console.error(`Error decoding transaction ${id}`);
                    console.error(`${destination}.${methodSignature}${value > 0 ? '{ value: '+value+' }' : ''}(?)`);
                }

                break;
            default:
                throw new Error(`Unknown multisig type: ${multisigType}`);
        }
    }
})()
    .catch(console.error)
    .finally(async () => {
        process.exit(0);
    });

function getFriendlyAddress(rawAddress, addressMappings) {
    return Object.entries(addressMappings).find(([name, address]) => Helper.isSameAddress(address, rawAddress))?.[0] ?? rawAddress;
}

function getFriendlyColoredConfirmation(rawAddress, addressMappings) {
    const friendlyAddress = getFriendlyAddress(rawAddress, addressMappings);
    return Helper.isSameAddress(rawAddress, CONFIG.WALLET.ADDRESS)
        ? chalk.green(friendlyAddress)
        : friendlyAddress;
}