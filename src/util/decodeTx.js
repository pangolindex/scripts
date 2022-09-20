const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');
const abiDecoder = require('abi-decoder');


// Change These Variables
// --------------------------------------------------
const destinationABI = ABI.ROUTER;
const bytecode = '0x0';
// --------------------------------------------------


abiDecoder.addABI(destinationABI);

const decoded = abiDecoder.decodeMethod(bytecode.trim());
console.dir(decoded, { depth: null });

const deadline = decoded?.params?.[0]?.value
  ? Object.entries(decoded?.params[0]?.value).filter(([key, value]) => key === 'deadline')[0]?.[1]
  : decoded?.params?.filter(param => param.name === 'deadline')[0]?.value;
if (deadline) {
    console.log(`Deadline: ${new Date(Number.parseInt(deadline) * 1000).toLocaleString()}`);
}
