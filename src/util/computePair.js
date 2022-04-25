const Web3 = require('web3');
const web3 = new Web3();

// Change These Variables
// --------------------------------------------------
const token0 = '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7';
const token1 = '0xf20d962a6c8f70c731bd838a3a388d7d48fa6e15';
// --------------------------------------------------

console.log(getPair(token0, token1));


function getPair(tokenA, tokenB) {
    const _initHash = '40231f6b438bce0797c9ada29b718a87ea0a5cea3fe9a771abdd76bd41a3e545';
    const _factory = '0xefa94de7a4656d787667c749f7e1223d71e9fd88';
    const packing = '000000000000000000000000';

    let [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA];

    let encodedTokens =  web3.eth.abi.encodeParameters(['address', 'address'], [token0, token1]);
    let encodedTokensPacked = encodedTokens.split(packing).join('');

    let salt = keccak256(encodedTokensPacked);

    let encodedFactory =  web3.eth.abi.encodeParameters(['address', 'bytes32'], [_factory, salt]);
    let encodedFactoryPacked = encodedFactory.split(packing).join('');

    let hashedData = keccak256( '0xff' + encodedFactoryPacked.slice(2) + _initHash )

    return '0x' + hashedData.slice(26);
}

function keccak256(...args) {
    return Web3.utils.soliditySha3(...args);
}
