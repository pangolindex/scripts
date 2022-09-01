const Web3 = require('web3');

const { address, privateKey } = new Web3().eth.accounts.create();

console.log(`Address: ${address}`);
console.log(`Key: ${privateKey}`);