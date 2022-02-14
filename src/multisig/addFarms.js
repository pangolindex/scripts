// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');

const fs = require('fs');
const path = require('path');
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

    console.log(`Encoding bytecode ...`);
    const bytecode = tx.encodeABI();
    const fileOutput = `./${path.basename(__filename, '.js')}-bytecode.txt`;
    fs.writeFileSync(fileOutput, bytecode);
    console.log(`Encoded bytecode to ${fileOutput}`);
    console.log();

    const multiTX = multiContract.methods.submitTransaction(
        miniChefContract._address,
        0,
        bytecode,
    );

    const gas = await tx.estimateGas({ from: CONFIG.WALLET.ADDRESS });
    const baseGasPrice = await web3.eth.getGasPrice();

    const receipt = await multiTX.send({
        from: CONFIG.WALLET.ADDRESS,
        gas,
        maxFeePerGas: baseGasPrice * 2,
        maxPriorityFeePerGas: web3.utils.toWei('2', 'nano'),
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
