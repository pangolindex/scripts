const Web3 = require('web3');
const ABI = require('./abi.json');
const Discord = require('./discord');


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
const LOW_BALANCE_THRESHOLD = process.env.LOW_BALANCE_THRESHOLD;
const TX_MAX_FEE = process.env.TX_MAX_FEE;
const TX_MAX_PRIORITY_FEE = process.env.TX_MAX_PRIORITY_FEE;
const DISCORD_ENABLED = process.env.DISCORD_ENABLED;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const DISCORD_CHAIN_ID = process.env.DISCORD_CHAIN_ID;
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
if (DISCORD_ENABLED === 'true') {
    if ((!!DISCORD_TOKEN && !DISCORD_CHANNEL_ID) || (!DISCORD_TOKEN && !!DISCORD_CHANNEL_ID)) {
        throw new Error('DISCORD_TOKEN and DISCORD_CHANNEL_ID are jointly required');
    }
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
    const isDiscordEnabled = DISCORD_ENABLED === 'true';
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

        // Used for retries
        let errorCount;

        // Vest funds
        errorCount = 0;
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
                if (++errorCount >= 3) {
                    if (isDiscordEnabled) {
                        await Discord.smartContractResult(
                            DISCORD_TOKEN,
                            DISCORD_CHANNEL_ID,
                            {
                                title: 'Vesting Error',
                                color: Discord.Colors.Red,
                                methodTo: vestContract._address,
                                methodName: `${vestMethod}()`,
                                message: error.message,
                                link: Discord.generateAddressLink(WALLET, DISCORD_CHAIN_ID),
                                chainId: DISCORD_CHAIN_ID,
                            },
                        );
                    }
                    throw new Error(`Maximum retry count (${errorCount}) exceeded`);
                }
                await sleep(SECOND.muln(5));
            }
        }

        // Fund chef
        errorCount = 0;
        if (isEmissionDiversionEnabled || isSafeDiversionEnabled) {
            const diversionContract = isEmissionDiversionEnabled ? emissionDiversion : safeFunder;
            const diversionMethod = isEmissionDiversionEnabled ? 'claimAndAddReward' : 'claimAndAddRewardUsingDiverter';

            while (true) {
                try {
                    console.log(`Calculating parameters for ${diversionMethod}(${EMISSION_DIVERSION_PID}) ...`);
                    const tx = diversionContract.methods[diversionMethod](EMISSION_DIVERSION_PID);

                    let gas;
                    try {
                        gas = await tx.estimateGas({ from: WALLET });
                    } catch (gasEstimationError) {
                        // Gracefully handle overflow detections when using safe diverter
                        if (isSafeDiversionEnabled && gasEstimationError.message.includes('execution reverted: OVERFLOW')) {
                            console.log(`Skipping ${diversionMethod}(${EMISSION_DIVERSION_PID}) due to OVERFLOW`);
                            if (isDiscordEnabled) {
                                await Discord.generalAlert(
                                    DISCORD_TOKEN,
                                    DISCORD_CHANNEL_ID,
                                    {
                                        title: 'Safe Diversion Triggered',
                                        color: Discord.Colors.Grey,
                                        message: `Skipped ${diversionMethod}(${EMISSION_DIVERSION_PID}) due to OVERFLOW`,
                                        link: Discord.generateAddressLink(WALLET, DISCORD_CHAIN_ID),
                                        chainId: DISCORD_CHAIN_ID,
                                    },
                                );
                            }
                            break;
                        } else {
                            throw gasEstimationError;
                        }
                    }

                    const baseGasPrice = await web3.eth.getGasPrice();

                    console.log(`Sending ${diversionMethod}(${EMISSION_DIVERSION_PID}) ...`);
                    const receipt = await tx.send({
                        from: WALLET,
                        gas,
                        maxFeePerGas: TX_MAX_FEE || baseGasPrice * 2,
                        maxPriorityFeePerGas: TX_MAX_PRIORITY_FEE || web3.utils.toWei('1', 'nano'),
                    });
                    console.log(`Sending ${diversionMethod}(${EMISSION_DIVERSION_PID}) hash: ${receipt.transactionHash}`);
                    break;
                } catch (error) {
                    console.error(`Error attempting ${diversionMethod}(${EMISSION_DIVERSION_PID})`);
                    console.error(error.message);
                    if (++errorCount > 3) {
                        if (isDiscordEnabled) {
                            await Discord.smartContractResult(
                                DISCORD_TOKEN,
                                DISCORD_CHANNEL_ID,
                                {
                                    title: 'Emission Diversion Error',
                                    color: Discord.Colors.Red,
                                    methodTo: diversionContract._address,
                                    methodName: `${diversionMethod}(${EMISSION_DIVERSION_PID})`,
                                    message: error.message,
                                    link: Discord.generateAddressLink(WALLET, DISCORD_CHAIN_ID),
                                    chainId: DISCORD_CHAIN_ID,
                                },
                            );
                        }
                        throw new Error(`Maximum retry count (${errorCount}) exceeded`);
                    }
                    await sleep(SECOND.muln(5));
                }
            }
        }

        if (isDiscordEnabled) {
            await Discord.smartContractResult(
                DISCORD_TOKEN,
                DISCORD_CHANNEL_ID,
                {
                    title: 'Vesting Completed',
                    color: Discord.Colors.Green,
                    link: Discord.generateAddressLink(WALLET, DISCORD_CHAIN_ID),
                    chainId: DISCORD_CHAIN_ID,
                },
            );
        }

        if (LOW_BALANCE_THRESHOLD) {
            const balance = await web3.eth.getBalance(WALLET).then(web3.utils.toBN);
            if (balance.lt(Web3.utils.toBN(LOW_BALANCE_THRESHOLD))) {
                console.log(`Low balance detected of ${balance.toString()}`);
                if (isDiscordEnabled) {
                    await Discord.lowBalance(
                        DISCORD_TOKEN,
                        DISCORD_CHANNEL_ID,
                        {
                            walletAddress: WALLET,
                            walletName: 'Vester Bot',
                            link: Discord.generateAddressLink(WALLET, DISCORD_CHAIN_ID),
                            chainId: DISCORD_CHAIN_ID,
                        },
                    );
                }
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