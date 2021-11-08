// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');

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

    const bytecode = tx.encodeABI();
    console.log();
    console.log(bytecode);
    console.log();

    const multiTX = multisig.methods.submitTransaction(
        gov._address,
        0,
        bytecode
    );

    console.log(`Submitting tx ...`);

    return multiTX.send({
        from: CONFIG.WALLET.ADDRESS,
        gas: await multiTX.estimateGas({ from: CONFIG.WALLET.ADDRESS }),
        gasPrice: await web3.eth.getGasPrice(),
    });
})()
  .then(response => {
      console.log(response);
      console.log(`Submitted!`);
      console.log(`Transaction: ${response.transactionHash}`);
  })
  .catch(console.error)
  .finally(process.exit);
