// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const GovernorPango = require('@pangolindex/exchange-contracts/artifacts/contracts/governance/GovernorPango.sol/GovernorPango.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
let gasSpent = web3.utils.toBN(0);

// Change These Variables
// --------------------------------------------------
const governorPangoAddress = '0x17f6ce028a49F1679d83daaeE62412f86B67fa24';
const proposalId = 5;
// --------------------------------------------------


(async () => {
    const governorPangoContract = new web3.eth.Contract(GovernorPango.abi, governorPangoAddress.toLowerCase());

    const tx = governorPangoContract.methods.execute(proposalId);

    const baseGasPrice = await web3.eth.getGasPrice();

    console.log(`Executing proposal #${proposalId} ...`);

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
