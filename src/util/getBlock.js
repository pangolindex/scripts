const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://sgb.ftso.com.au/ext/bc/C/rpc'));

// Change These Variables
// ---------------------------------------------------------------
const blockNumber = 22822511;
// ---------------------------------------------------------------


(async () => {
    const block = await web3.eth.getBlock(blockNumber);
    console.log(`Block Number: ${blockNumber}`);
    console.log(`Block time: ${new Date(block.timestamp * 1000).toLocaleString()}`);
})();
