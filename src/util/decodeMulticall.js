const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');
const path = require('path');
const fs = require('fs');
const Helper = require('../core/helpers');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));

// Change These Variables
// --------------------------------------------------
const multicalls = [
  {
    "address": "0xE4B684e25aa0A77D577100b9E80806FBb42E4Fe8",
    "callData": "0x0902f1ac"
  },
  {
    "address": "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    "callData": "0x17caf6f1"
  },
  {
    "address": "0xEAadeae5edF2534AAAdF2a1701eb5FAd93a66401",
    "callData": "0x34c0b46b"
  },
  {
    "address": "0xEAadeae5edF2534AAAdF2a1701eb5FAd93a66401",
    "callData": "0x8f10369a"
  },
  {
    "address": "0xEAadeae5edF2534AAAdF2a1701eb5FAd93a66401",
    "callData": "0xb76f4aeb"
  },
];
const additionalAbis = [
  // [{"inputs":[{"internalType":"address","name":"pair","type":"address"},{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferAndSync","outputs":[],"stateMutability":"nonpayable","type":"function"}],
];
// --------------------------------------------------

const abiOptions = [].concat(...Object.values(ABI)).concat(...additionalAbis);
const methods = abiOptions
  .filter(entry => entry?.type === 'function')
  .map(entry => ({
    name: entry.name,
    args: entry.inputs.map(input => input.type),
  }))
  .map(data => ({
    ...data,
    signature: `${data.name}(${data.args.join(',')})`
  }))
  .map(data => ({
    ...data,
    encodedSignature: web3.eth.abi.encodeFunctionSignature(data.signature),
  }));

const methodNames = methods.map(method => method.name);
const encodedSignatures = methods.map(method => method.encodedSignature);
const types = methods.map(method => method.args);


for (const multicall of multicalls) {
  const methodSignature = multicall.callData.slice(0, 10);
  const methodData = multicall.callData.slice(10);

  const i = encodedSignatures.indexOf(methodSignature);

  if (i >= 0) {
    const methodName = methodNames[i];
    const decodedParams = web3.eth.abi.decodeParameters(types[i], methodData);
    const params = Object.entries(decodedParams).filter(([k,v]) => k !== '__length__').map(([k,v]) => v);
    const addressFriendly = Object.entries(ADDRESS).find(([name, address]) => Helper.isSameAddress(address, multicall.address))?.[0];
    if (addressFriendly) {
      multicall.translated = `${addressFriendly}.${methodName}(${params.join(',')})`;
    } else {
      multicall.translated = `${methodName}(${params.join(',')})`;
    }
  } else {
    console.log(`ERROR @ ${multicall.address}`);
  }
}

console.log(multicalls);

const fileName = path.basename(__filename, '.js');
const fileOutput = path.join(__dirname, `${fileName}-bytecode.txt`);
fs.writeFileSync(fileOutput, JSON.stringify(multicalls));
console.log(`Encoded bytecode to ${fileOutput}`);
console.log();