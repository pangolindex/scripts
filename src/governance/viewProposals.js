// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ADDRESS = require('../../config/address.json');
const GovernorAlpha = require('@pangolindex/exchange-contracts/artifacts/contracts/governance/GovernorAlpha.sol/GovernorAlpha.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));

// Change These Variables
// --------------------------------------------------
const governorAlphaAddress = ADDRESS.PANGOLIN_GOVERNANCE_ADDRESS;
// --------------------------------------------------


(async () => {
    const governorAlphaContract = new web3.eth.Contract(GovernorAlpha.abi, governorAlphaAddress.toLowerCase());
    const proposalCount = await governorAlphaContract.methods.proposalCount().call();

    for (let i = proposalCount; i>0; i--) {
        const proposal = await governorAlphaContract.methods.proposals(i).call();
        console.log(proposal);
    }
})()
    .catch(console.error)
    .finally(() => process.exit(0));
