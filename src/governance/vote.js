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
const PROPOSAL = 6;
const VOTE = true;
// --------------------------------------------------


(async () => {
    const multisig = new web3.eth.Contract(ABI.GNOSIS_MULTISIG, ADDRESS.PANGOLIN_MULTISIG_ADDRESS);

    const gov = new web3.eth.Contract(ABI.GOVERNOR_ALPHA, ADDRESS.PANGOLIN_GOVERNANCE_ADDRESS);
    const tx = await gov.methods.castVote(
      PROPOSAL,
      VOTE,
    );

    console.log(`Encoding bytecode ...`);
    const bytecode = tx.encodeABI();
    const fileOutput = `./${path.basename(__filename, '.js')}-bytecode.txt`;
    fs.writeFileSync(fileOutput, bytecode);
    console.log(`Encoded bytecode to ${fileOutput}`);
    console.log();

    const multiTX = multisig.methods.submitTransaction(
        gov._address,
        0,
        bytecode,
    );

    const gas = await multiTX.estimateGas({ from: CONFIG.WALLET.ADDRESS });
    const baseGasPrice = await web3.eth.getGasPrice();

    console.log(`Submitting tx ...`);

    return multiTX.send({
        from: CONFIG.WALLET.ADDRESS,
        gas,
        maxFeePerGas: baseGasPrice * 2,
        maxPriorityFeePerGas: web3.utils.toWei('2', 'nano'),
    });
})()
  .then(response => {
      console.log(response);
      console.log(`Submitted!`);
      console.log(`Transaction: ${response.transactionHash}`);
  })
  .catch(console.error)
  .finally(process.exit);
