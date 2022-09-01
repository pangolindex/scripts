const CONFIG = require('../../config/config');
const ADDRESS = require('../../config/address.json');
const ABI = require('../../config/abi.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
const abiDecoder = require('abi-decoder');


// Change These Variables
// --------------------------------------------------
const destinationAddress = ADDRESS.PANGOLIN_ROUTER;
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

if (!destinationAddress) return;

console.log();
console.log('Estimating gas ...');

web3.eth.estimateGas({
    from: ADDRESS.PANGOLIN_GNOSIS_SAFE_ADDRESS,
    to: destinationAddress,
    value: 0,
    data: bytecode,
}, function(error, gas) {
    if (error) console.error(error.message);
    else console.log(gas);
});
