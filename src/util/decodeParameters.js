const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));


// Change These Variables
// --------------------------------------------------
const types = ['uint256', 'address[]'];
const bytecode = '0x0';
// --------------------------------------------------


const decoded = web3.eth.abi.decodeParameters(types, bytecode);
console.log(decoded);
