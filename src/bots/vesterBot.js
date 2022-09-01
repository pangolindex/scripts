const Web3 = require('web3');
const ABI = require('../../config/abi.json');
const Helper = require('../core/helpers');


// Variables
// --------------------------------------------------
const RPC = process.env.RPC;
const WALLET = process.env.WALLET;
const KEY = process.env.KEY;
const TREASURY_VESTER = process.env.TREASURY_VESTER;
const TREASURY_VESTER_PROXY = process.env.TREASURY_VESTER_PROXY;
// --------------------------------------------------
if (!RPC) {
    throw new Error('Invalid RPC');
}
if (!Web3.utils.isAddress(WALLET)) {
    throw new Error('Invalid WALLET');
}
if (!KEY) {
    throw new Error('Invalid KEY');
}
if (!Web3.utils.isAddress(TREASURY_VESTER)) {
    throw new Error('Invalid TREASURY_VESTER');
}
if (!!TREASURY_VESTER_PROXY && !Web3.utils.isAddress(TREASURY_VESTER_PROXY)) {
    throw new Error('Invalid TREASURY_VESTER_PROXY');
}
// --------------------------------------------------


const web3 = new Web3(new Web3.providers.HttpProvider(RPC));
web3.eth.accounts.wallet.add(KEY);

main()
  .then(() => process.exit(0))
  .catch(error => {
      console.error(error);
      process.exit(1);
  });

async function main() {
    const isProxyEnabled = !!TREASURY_VESTER_PROXY && !Helper.isSameAddress(TREASURY_VESTER_PROXY, '0x0000000000000000000000000000000000000000');
    const treasuryVester = new web3.eth.Contract(ABI.TREASURY_VESTER, TREASURY_VESTER);
    const treasuryVesterProxy = new web3.eth.Contract(ABI.TREASURY_VESTER_PROXY, TREASURY_VESTER_PROXY);
    const vestContract = isProxyEnabled ? treasuryVesterProxy : treasuryVester;
    const vestMethod = isProxyEnabled ? 'claimAndDistribute' : 'distribute';
    const vestArgs = isProxyEnabled ? [] : [];
    const SECOND = Web3.utils.toBN(1000);
    const DAY = Web3.utils.toBN(86400000);

    while (true) {
        // Gather info
        const fundsLastAvailableBlockTime = web3.utils.toBN(await treasuryVester.methods.lastUpdate().call());

        // Adjust block time to epoch time
        const fundsLastAvailableEpochTime = fundsLastAvailableBlockTime.muln(1000);
        const fundsNextAvailableEpochTime = fundsLastAvailableEpochTime.add(DAY).add(SECOND);

        console.log(`Detected next available vesting at ${new Date(fundsNextAvailableEpochTime.toNumber()).toLocaleString('en-US')}`);

        // Wait for available funds
        while (fundsNextAvailableEpochTime.gte(now())) {
            const delay = fundsNextAvailableEpochTime.sub(now());
            await sleep(delay);
        }

        let errorCount = 0;

        // Vest funds
        while (web3.utils.toBN(await treasuryVester.methods.lastUpdate().call()).eq(fundsLastAvailableBlockTime)) {
            try {
                console.log(`Calculating parameters for ${vestMethod}() ...`);
                const tx = vestContract.methods[vestMethod](...vestArgs);
                const gas = await tx.estimateGas({ from: WALLET });
                const baseGasPrice = await web3.eth.getGasPrice();

                console.log(`Sending ${vestMethod}() ...`);
                const receipt = await tx.send({
                    from: WALLET,
                    gas,
                    maxFeePerGas: baseGasPrice * 2,
                    maxPriorityFeePerGas: web3.utils.toWei('1', 'nano'),
                });
                console.log(`Transaction hash: ${receipt.transactionHash}`);
            } catch (error) {
                console.error(`Error attempting ${vestMethod}()`);
                console.error(error.message);
                if (++errorCount >= 5) {
                    throw new Error(`Maximum retry count (${errorCount}) exceeded`);
                }
            }
            await sleep(SECOND.muln(5));
        }
    }
}

function sleep(ms) {
    if (ms.isNeg()) return;

    const wakeTime = ms.add(now());

    console.log(`Sleeping until ${new Date(wakeTime.toNumber()).toLocaleString('en-US')} (${ms.toNumber().toLocaleString('en-US')} ms) ...`);

    return new Promise((resolve) => {
        setTimeout(resolve, ms.toNumber());
    });
}

function now() {
    return web3.utils.toBN(Date.now());
}
