const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));


// Change These Variables
// ---------------------------------------------------------------
const proxyAddress = '0x386B60a13f1cF54b4fd0ae9f4493bA9Eb6BBdD07';
const IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const ROLLBACK_SLOT = '0x4910fdfa16fed3260ed0e7147f7cc6da11a60208b5b9406d12a635614ffd9143';
const ADMIN_SLOT = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
// ---------------------------------------------------------------


(async () => {
    let address;

    address = await getAddressAtStorage(proxyAddress, IMPLEMENTATION_SLOT);
    console.log(`IMPLEMENTATION_SLOT => https://snowtrace.io/address/${address}`);

    address = await getAddressAtStorage(proxyAddress, ROLLBACK_SLOT);
    console.log(`ROLLBACK_SLOT => https://snowtrace.io/address/${address}`);

    address = await getAddressAtStorage(proxyAddress, ADMIN_SLOT);
    console.log(`ADMIN_SLOT => https://snowtrace.io/address/${address}`);
})();

async function getAddressAtStorage(proxyAddress, storageSlot) {
    const data = await web3.eth.getStorageAt(proxyAddress.toLowerCase(), storageSlot);
    return `0x${data.slice(-40)}`;
}
