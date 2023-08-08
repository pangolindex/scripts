// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ADDRESS = require('../../config/address.json');
const Timelock = require('@pangolindex/exchange-contracts/artifacts/contracts/governance/Timelock.sol/Timelock.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));

// Change These Variables
// --------------------------------------------------
const timelockAddress = ADDRESS.PANGOLIN_TIMELOCK_ADDRESS;
// --------------------------------------------------


(async () => {
    const timelockContract = new web3.eth.Contract(Timelock.abi, timelockAddress);

    const pendingAdmin = await timelockContract.methods.pendingAdmin().call();
    console.log(`pendingAdmin:  ${pendingAdmin}`);
    const admin = await timelockContract.methods.admin().call();
    console.log(`admin:         ${admin}`);
    const delay = await timelockContract.methods.delay().call();
    console.log(`delay:         ${delay / 86_400} days`);
})()
    .catch(console.error)
    .finally(() => process.exit(0));
