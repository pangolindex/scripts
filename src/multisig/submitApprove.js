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
const tokenAddress = ADDRESS.WAVAX;
const spenderAddress = '0x0000000000000000000000000000000000000000';
const allowanceAmount = '0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
// --------------------------------------------------


/*
 * This is an example of approving an ERC20 token to be spent by the multisig
 */
(async () => {
    const multiContract = new web3.eth.Contract(ABI.GNOSIS_MULTISIG, ADDRESS.PANGOLIN_MULTISIG_ADDRESS);
    const tokenContract = new web3.eth.Contract(ABI.TOKEN, tokenAddress);

    const tx = tokenContract.methods.approve(
        spenderAddress,
        allowanceAmount
    );

    console.log(`Encoding bytecode ...`);
    const bytecode = tx.encodeABI();
    const fileOutput = `./${path.basename(__filename, '.js')}-bytecode.txt`;
    fs.writeFileSync(fileOutput, bytecode);
    console.log(`Encoded bytecode to ${fileOutput}`);
    console.log();

    const multiTX = multiContract.methods.submitTransaction(
        tokenContract._address,
        0,
        tx.encodeABI(),
    );

    const gas = await multiTX.estimateGas({ from: CONFIG.WALLET.ADDRESS });
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
