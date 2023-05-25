// Helper modules to provide common or secret values
const ADDRESS = require('../../config/address.json');
const CONSTANTS = require('../core/constants');
const { owners: gnosisMultisigOwners } = require('../core/gnosisMultisig');
const { owners: gnosisSafeOwners } = require('../core/gnosisSafe');


// Change These Variables
// --------------------------------------------------
const multisigAddress = ADDRESS.FLARE_GNOSIS_MULTISIG_ADDRESS;
const multisigType = CONSTANTS.GNOSIS_MULTISIG;
// --------------------------------------------------


/*
 * This is an example of listing multisig owners
 */
(async () => {
    console.log(`Owners for the ${multisigAddress} multisig:`);
    switch (multisigType) {
        case CONSTANTS.GNOSIS_MULTISIG:
            console.log(await gnosisMultisigOwners({multisigAddress}));
            break;
        case CONSTANTS.GNOSIS_SAFE:
            console.log(await gnosisSafeOwners({multisigAddress}));
            break;
        default:
            throw new Error(`Unknown multisig type: ${multisigType}`);
    }
})()
    .catch(console.error)
    .finally(() => {
        process.exit(0);
    });
