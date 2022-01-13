const abiDecoder = require('abi-decoder');
const ABI = require('../../config/abi.json');


// Change These Variables
// --------------------------------------------------
const bytecode = '0x0';
const destinationABI = ABI.ROUTER;
// --------------------------------------------------


abiDecoder.addABI(destinationABI);

const decoded = abiDecoder.decodeMethod(bytecode);
console.log(decoded);
