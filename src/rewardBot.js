// Helper modules to provide common or secret values
const CONFIG = require('../config/config');
const ABI = require('../config/abi.json');
const ADDRESS = require('../config/address.json');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);

// Constants
const ONE_SECOND = web3.utils.toBN(1000);
const ONE_DAY = ONE_SECOND.muln(86400);
const treasuryVester = new web3.eth.Contract(ABI.TREASURY_VESTER, ADDRESS.PANGOLIN_TREASURY_VESTER);
const treasuryVesterProxy = new web3.eth.Contract(ABI.TREASURY_VESTER_PROXY, ADDRESS.PANGOLIN_TREASURY_VESTER_PROXY);

const main = async () => {
    while (true) {
        // Gather info
        const fundsLastAvailableBlockTime = web3.utils.toBN(await treasuryVester.methods.lastUpdate().call());

        // Adjust block time to epoch time
        const fundsLastAvailableEpochTime = fundsLastAvailableBlockTime.muln(1000);
        const fundsNextAvailableEpochTime = fundsLastAvailableEpochTime.add(ONE_DAY).add(ONE_SECOND);

        console.log(`Detected next available vesting at ${new Date(fundsNextAvailableEpochTime.toNumber()).toLocaleString('en-US')}`);

        // Wait for available funds
        while (fundsNextAvailableEpochTime.gte(now())) {
            const delay = fundsNextAvailableEpochTime.sub(now());
            await sleep(delay);
        }

        // Claim and distribute funds
        while (web3.utils.toBN(await treasuryVester.methods.lastUpdate().call()).eq(fundsLastAvailableBlockTime)) {
            try {
                console.log('Calculating parameters for claimAndDistribute() ...');
                const tx = treasuryVesterProxy.methods.claimAndDistribute();
                const gas = await tx.estimateGas({ from: CONFIG.WALLET.ADDRESS });
                const baseGasPrice = await web3.eth.getGasPrice();

                console.log('Sending claimAndDistribute() ...');
                const receipt = await tx.send({
                    from: CONFIG.WALLET.ADDRESS,
                    gas,
                    maxFeePerGas: baseGasPrice * 2,
                    maxPriorityFeePerGas: web3.utils.toWei('1', 'nano'),
                });
                console.log(`Transaction hash: ${receipt.transactionHash} (${snowtraceLink(receipt.transactionHash)}`);
            } catch (error) {
                console.error(`Error attempting claimAndDistribute()`);
                console.error(error.message);
                await sleep(web3.utils.toBN(1000));
            }
        }
    }
};

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

function snowtraceLink(hash) {
    return `https://snowtrace.io/tx/${hash}`;
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