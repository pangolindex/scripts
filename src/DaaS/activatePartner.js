// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ADDRESS = require('../../config/address.json');
const PangolinRouterSupportingFees = require('@pangolindex/exchange-contracts/artifacts/contracts/pangolin-periphery/PangolinRouterSupportingFees.sol/PangolinRouterSupportingFees.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
let gasSpent = web3.utils.toBN(0);


// Change These Variables
// --------------------------------------------------
const partner = '0x0000000000000000000000000000000000000000';
const routerAddress = ADDRESS.DAAS_ROUTER_MAINNET;
// --------------------------------------------------


(async () => {
    const routerSupportingFeesContract = new web3.eth.Contract(PangolinRouterSupportingFees.abi, routerAddress.toLowerCase());

    const tx = routerSupportingFeesContract.methods.activatePartner(partner);

    const gas = await tx.estimateGas({ from: CONFIG.WALLET.ADDRESS });
    const baseGasPrice = await web3.eth.getGasPrice();

    console.log('Sending tx ...');
    const receipt = await tx.send({
        from: CONFIG.WALLET.ADDRESS,
        gas: gas,
        maxFeePerGas: baseGasPrice * 2,
        maxPriorityFeePerGas: web3.utils.toWei('1', 'nano'),
    });

    gasSpent.iadd(web3.utils.toBN(receipt.effectiveGasPrice).mul(web3.utils.toBN(receipt.gasUsed)));

    if (!receipt?.status) {
        console.log(receipt);
        process.exit(1);
    } else {
        console.log(`Transaction hash: ${receipt.transactionHash}`);
    }
})()
    .catch(console.error)
    .finally(async () => {
        console.log(`Gas spent: ${gasSpent / (10 ** 18)}`);
        process.exit(0);
    });
