// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);


// Change These Variables
// --------------------------------------------------
const farms = [
    {
        pgl: '0x0000000000000000000000000000000000000000',
        weight: 100 // 1x farm
    }
];
// --------------------------------------------------


const pglAddresses = farms.map(farm => farm.pgl);
const allocationPoints = farms.map(farm => farm.weight);
const rewarderAddresses = farms.map(farm => farm.rewarder ?? ADDRESS.ZERO_ADDRESS); // Typically zero address

/*
 * This is an example of adding farms via the multisig
 */
(async () => {
    const multiContract = new web3.eth.Contract(ABI.GNOSIS_MULTISIG, ADDRESS.PANGOLIN_MULTISIG_ADDRESS);
    const miniChefContract = new web3.eth.Contract(ABI.MINICHEF_V2, ADDRESS.PANGOLIN_MINICHEF_V2_ADDRESS);

    const tx = miniChefContract.methods.addPools(
        allocationPoints,
        pglAddresses,
        rewarderAddresses,
    );

    const multiTX = multiContract.methods.submitTransaction(
        miniChefContract._address,
        0,
        tx.encodeABI(),
    );

    const receipt = await multiTX.send({
        from: CONFIG.WALLET.ADDRESS,
        gas: await multiTX.estimateGas({ from: CONFIG.WALLET.ADDRESS }),
        gasPrice: await web3.eth.getGasPrice()
    });

    if (!receipt?.status) {
        console.log(receipt);
        process.exit(1);
    } else {
        console.log(`Transaction hash: ${receipt.transactionHash}`);
    }
})()
  .catch(console.error)
  .finally(process.exit);
