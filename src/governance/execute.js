// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ADDRESS = require('../../config/address.json');
const GovernorAlpha = require('@pangolindex/exchange-contracts/artifacts/contracts/governance/GovernorAlpha.sol/GovernorAlpha.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
let gasSpent = web3.utils.toBN(0);

// Change These Variables
// --------------------------------------------------
const governorAlphaAddress = ADDRESS.PANGOLIN_GOVERNANCE_ADDRESS;
const proposal = 5;
// --------------------------------------------------


(async () => {
    const governorAlphaContract = new web3.eth.Contract(GovernorAlpha.abi, governorAlphaAddress.toLowerCase());

    const tx = governorAlphaContract.methods.execute(proposal);

    const baseGasPrice = await web3.eth.getGasPrice();

    console.log(`Executing proposal #${proposal} ...`);

    const receipt = await tx.send({
        from: CONFIG.WALLET.ADDRESS,
        gas: '8000000',
        maxFeePerGas: baseGasPrice * 2,
        maxPriorityFeePerGas: web3.utils.toWei('1', 'nano'),
    });

    gasSpent.iadd(web3.utils.toBN(receipt.effectiveGasPrice).mul(web3.utils.toBN(receipt.gasUsed)));
})()
    .catch(console.error)
    .finally(async () => {
        console.log(`Gas spent: ${gasSpent / (10 ** 18)}`);
        process.exit(0);
    });
