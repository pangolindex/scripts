const abiDecoder = require('abi-decoder');
const ABI = require('../../config/abi.json');


// Change These Variables
// --------------------------------------------------
const destinationABI = ABI.ROUTER;
const bytecode = '0x0';
// --------------------------------------------------


abiDecoder.addABI(destinationABI);

const decoded = abiDecoder.decodeMethod(bytecode);
console.log(decoded);
