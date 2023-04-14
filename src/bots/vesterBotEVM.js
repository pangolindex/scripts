const Web3 = require('web3');
const ABI = require('./abi.json');


// Variables
// --------------------------------------------------
const RPC = process.env.RPC;
const WALLET = process.env.WALLET;
const KEY = process.env.KEY;
const TREASURY_VESTER = process.env.TREASURY_VESTER;
const TREASURY_VESTER_PROXY = process.env.TREASURY_VESTER_PROXY;
const SAFE_FUNDER = process.env.SAFE_FUNDER;
const EMISSION_DIVERSION = process.env.EMISSION_DIVERSION;
const EMISSION_DIVERSION_PID = process.env.EMISSION_DIVERSION_PID;
const TX_MAX_FEE = process.env.TX_MAX_FEE;
const TX_MAX_PRIORITY_FEE = process.env.TX_MAX_PRIORITY_FEE;
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
if (!!SAFE_FUNDER && !Web3.utils.isAddress(SAFE_FUNDER)) {
    throw new Error('Invalid SAFE_FUNDER');
}
if (!!EMISSION_DIVERSION && !Web3.utils.isAddress(EMISSION_DIVERSION)) {
    throw new Error('Invalid EMISSION_DIVERSION');
}
if (!!SAFE_FUNDER && !!EMISSION_DIVERSION) {
    throw new Error('SAFE_FUNDER and EMISSION_DIVERSION cannot be jointly provided');
}
if ((!!EMISSION_DIVERSION && !EMISSION_DIVERSION_PID)) {
    throw new Error('EMISSION_DIVERSION and EMISSION_DIVERSION_PID are jointly required');
}
if ((!!SAFE_FUNDER && !EMISSION_DIVERSION_PID)) {
    throw new Error('SAFE_FUNDER and EMISSION_DIVERSION_PID are jointly required');
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
    const isProxyEnabled = !!TREASURY_VESTER_PROXY && !isSameAddress(TREASURY_VESTER_PROXY, '0x0000000000000000000000000000000000000000');
    const isEmissionDiversionEnabled = !!EMISSION_DIVERSION && !isSameAddress(EMISSION_DIVERSION, '0x0000000000000000000000000000000000000000');
    const isSafeDiversionEnabled = !!SAFE_FUNDER && !isSameAddress(SAFE_FUNDER, '0x0000000000000000000000000000000000000000');
    const treasuryVester = new web3.eth.Contract(isProxyEnabled ? ABI.TREASURY_VESTER_LEGACY : ABI.TREASURY_VESTER, TREASURY_VESTER);
    const treasuryVesterProxy = new web3.eth.Contract(ABI.TREASURY_VESTER_PROXY, TREASURY_VESTER_PROXY);
    const emissionDiversion = new web3.eth.Contract(ABI.EMISSION_DIVERSION_FROM_PANGO_CHEF_TO_STAKING_POSITIONS, EMISSION_DIVERSION);
    const safeFunder = new web3.eth.Contract(ABI.SAFE_FUNDER_FOR_PANGOLIN_STAKING_POSITIONS, SAFE_FUNDER);
    const vestContract = isProxyEnabled ? treasuryVesterProxy : treasuryVester;
    const vestMethod = isProxyEnabled ? 'claimAndDistribute' : 'distribute';
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
            await sleep(delay.add(SECOND), true);
        }

        // Vest funds
        let errorCount = 0;
        while (web3.utils.toBN(await treasuryVester.methods.lastUpdate().call()).eq(fundsLastAvailableBlockTime)) {
            try {
                console.log(`Calculating parameters for ${vestMethod}() ...`);
                const tx = vestContract.methods[vestMethod]();
                const gas = await tx.estimateGas({ from: WALLET });
                const baseGasPrice = await web3.eth.getGasPrice();

                console.log(`Sending ${vestMethod}() ...`);
                const receipt = await tx.send({
                    from: WALLET,
                    gas,
                    maxFeePerGas: TX_MAX_FEE || baseGasPrice * 2,
                    maxPriorityFeePerGas: TX_MAX_PRIORITY_FEE || web3.utils.toWei('1', 'nano'),
                });
                console.log(`Sending ${vestMethod}() hash: ${receipt.transactionHash}`);
                break;
            } catch (error) {
                console.error(`Error attempting ${vestMethod}()`);
                console.error(error.message);
                if (++errorCount >= 5) {
                    throw new Error(`Maximum retry count (${errorCount}) exceeded`);
                }
                await sleep(SECOND.muln(5));
            }
        }

        if (isEmissionDiversionEnabled || isSafeDiversionEnabled) {
            const diversionContract = isEmissionDiversionEnabled ? emissionDiversion : safeFunder;
            const diversionMethod = isEmissionDiversionEnabled ? 'claimAndAddReward' : 'claimAndAddRewardUsingDiverter';

            try {
                console.log(`Calculating parameters for ${diversionMethod}(${EMISSION_DIVERSION_PID}) ...`);
                const tx = diversionContract.methods[diversionMethod](EMISSION_DIVERSION_PID);
                const gas = await tx.estimateGas({ from: WALLET });
                const baseGasPrice = await web3.eth.getGasPrice();

                console.log(`Sending ${diversionMethod}(${EMISSION_DIVERSION_PID}) ...`);
                const receipt = await tx.send({
                    from: WALLET,
                    gas,
                    maxFeePerGas: TX_MAX_FEE || baseGasPrice * 2,
                    maxPriorityFeePerGas: TX_MAX_PRIORITY_FEE || web3.utils.toWei('1', 'nano'),
                });
                console.log(`Sending ${diversionMethod}(${EMISSION_DIVERSION_PID}) hash: ${receipt.transactionHash}`);
            } catch (error) {
                console.error(`Error attempting ${diversionMethod}(${EMISSION_DIVERSION_PID})`);
                console.error(error.message);
            }
        }

        // Fixed delay to allow chain data via potentially slower nodes to update
        await sleep(SECOND.muln(10));
    }
}

function sleep(ms, display=false) {
    if (ms.isNeg()) return;

    const wakeTime = ms.add(now());

    if (display) {
        console.log(`Sleeping until ${new Date(wakeTime.toNumber()).toLocaleString('en-US')} (${ms.toNumber().toLocaleString('en-US')} ms) ...`);
    }

    return new Promise((resolve) => {
        setTimeout(resolve, ms.toNumber());
    });
}

function now() {
    return web3.utils.toBN(Date.now());
}

function isSameAddress(a, b) {
    if (!a || !b) return false;
    return a.toLowerCase() === b.toLowerCase();
}