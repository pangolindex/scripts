// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);

// Multisig Config
const multi = new web3.eth.Contract(ABI.GNOSIS_MULTISIG, ADDRESS.PANGOLIN_MULTISIG_ADDRESS);

(async () => {
    const DESTINATION = ADDRESS.PANGOLIN_COMMUNITY_TREASURY;
    const VALUE = 0;
    const SIGNATURE = 'transfer(address,uint256)';

    const TWO_MILLION_PNG = '2000000' + '0'.repeat(18);

    const DATA = web3.eth.abi.encodeParameters(
        ['address', 'uint256'],
        [ADDRESS.PANGOLIN_MULTISIG_ADDRESS, TWO_MILLION_PNG]
    );

    const gov = new web3.eth.Contract(ABI.GOVERNOR_ALPHA, ADDRESS.PANGOLIN_GOVERNANCE_ADDRESS);

    const tx = await gov.methods.propose(
        [DESTINATION],
        [VALUE],
        [SIGNATURE],
        [DATA],
`# Pangolin Rush

TLDR: Implement Pangolin Rush by boosting the new rewards system

## What is the goal?
Pangolin is implementing a new and improved farming system next month and would like to kick off with a bang!

## What would changing?
We propose transferring 2m PNG from the CommunityTreasury to the multisig to boost the upcoming new farm rewards system. 
All rewards will go to Pangolin users providing liquidity incentivising a smooth migration and continued loyalty. 
This new reward system will be implemented next month following a successful audit and will accompany the rollout 
of the totally new Pangolin UI.

## Technical Proposal
We will transfer 2m PNG from CommunityTreasury to the Pangolin multisig.`
    );

    console.log(`Encoding bytecode ...`)
    const bytecode = tx.encodeABI();
    console.log(`Encoded bytecode:`)
    console.log(bytecode);
    console.log();

    console.log(`Creating multisig transaction ...`);
    const multisigTX = multi.methods.submitTransaction(
      ADDRESS.PANGOLIN_GOVERNANCE_ADDRESS,
      0,
      bytecode,
    );
    console.log();

    console.log(`Estimating gas ...`);
    const gas = await multisigTX.estimateGas({ from: CONFIG.WALLET.ADDRESS });
    const gasPrice = await web3.eth.getGasPrice();
    console.log(`Estimated gas: ${(parseInt(gas) * gasPrice / (10 ** 18)).toFixed(5)} AVAX`);
    console.log();


    console.log(`Will send transaction in 15 seconds ...`);
    await new Promise(resolve => setTimeout(resolve, 15000));
    console.log();


    console.log(`Submitting transaction to multisig ...`);
    return multisigTX.send({
        from: CONFIG.WALLET.ADDRESS,
        gas,
        gasPrice,
    });
})()
  .then(console.log)
  .catch(console.error)
  .finally(process.exit);