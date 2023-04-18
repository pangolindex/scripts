const Web3 = require('web3');
const {Client, ContractExecuteTransaction, AccountId, ContractFunctionParameters, ContractInfoQuery, PrivateKey, ContractCallQuery, AccountBalanceQuery} = require('@hashgraph/sdk');
const Discord = require('./discord');

// Variables
// --------------------------------------------------
const WALLET = process.env.WALLET;
const KEY = process.env.KEY;
const NETWORK = process.env.NETWORK;
const PNG_HTS_ADDRESS = process.env.PNG_HTS_ADDRESS;
const TREASURY_VESTER = process.env.TREASURY_VESTER;
const REWARD_FUNDING_FORWARDER = process.env.REWARD_FUNDING_FORWARDER;
const EMISSION_DIVERSION = process.env.EMISSION_DIVERSION;
const EMISSION_DIVERSION_PID = process.env.EMISSION_DIVERSION_PID;
const LOW_BALANCE_THRESHOLD = process.env.LOW_BALANCE_THRESHOLD;
const DISCORD_ENABLED = process.env.DISCORD_ENABLED;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const DISCORD_CHAIN_ID = process.env.DISCORD_CHAIN_ID;
// --------------------------------------------------
if (!WALLET || !Web3.utils.isAddress(WALLET)) {
    throw new Error('Invalid WALLET');
}
if (!KEY) {
    throw new Error('Invalid KEY');
}
if (!NETWORK || !['testnet', 'mainnet'].includes(NETWORK)) {
    throw new Error('Invalid NETWORK');
}
if (!PNG_HTS_ADDRESS || !Web3.utils.isAddress(PNG_HTS_ADDRESS)) {
    throw new Error('Invalid PNG_HTS_ADDRESS');
}
if (!TREASURY_VESTER || !Web3.utils.isAddress(TREASURY_VESTER)) {
    throw new Error('Invalid TREASURY_VESTER');
}
if (!REWARD_FUNDING_FORWARDER || !Web3.utils.isAddress(REWARD_FUNDING_FORWARDER)) {
    throw new Error('Invalid REWARD_FUNDING_FORWARDER');
}
if (!!EMISSION_DIVERSION && !Web3.utils.isAddress(EMISSION_DIVERSION)) {
    throw new Error('Invalid EMISSION_DIVERSION');
}
if (!!EMISSION_DIVERSION && !EMISSION_DIVERSION_PID) {
    throw new Error('EMISSION_DIVERSION and EMISSION_DIVERSION_PID are jointly required');
}
if (DISCORD_ENABLED === 'true') {
    if ((!!DISCORD_TOKEN && !DISCORD_CHANNEL_ID) || (!DISCORD_TOKEN && !!DISCORD_CHANNEL_ID)) {
        throw new Error('DISCORD_TOKEN and DISCORD_CHANNEL_ID are jointly required');
    }
}
// --------------------------------------------------


const isDiscordEnabled = DISCORD_ENABLED === 'true';
const myAccountId = AccountId.fromSolidityAddress(WALLET).toString();
const myPrivateKey = PrivateKey.fromStringED25519(KEY);
let client;
if (NETWORK === 'testnet') client = Client.forTestnet();
if (NETWORK === 'mainnet') client = Client.forMainnet();
if (!client) throw new Error(`Invalid NETWORK`);
client.setOperator(myAccountId, myPrivateKey);

const SECOND = Web3.utils.toBN(1_000);
const DAY = Web3.utils.toBN(86_400 * 1_000);

main()
  .then(() => process.exit(0))
  .catch(async (error) => {
      console.error(error);
      if (isDiscordEnabled) {
          await Discord.generalAlert(
              DISCORD_TOKEN,
              DISCORD_CHANNEL_ID,
              {
                  title: 'Fatal Vesting Bot Error',
                  color: Discord.Colors.Red,
                  message: error.message,
                  link: Discord.generateAddressLink(WALLET, DISCORD_CHAIN_ID),
                  chainId: DISCORD_CHAIN_ID,
              },
          );
      }
  });

async function main() {
    const isDiversionEnabled = !!EMISSION_DIVERSION && !isSameAddress(EMISSION_DIVERSION, '0x0000000000000000000000000000000000000000');

    while (true) {
        let tx, receipt, record;

        const fundsLastAvailableBlockTime = await getLastUpdatedTime();

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

        // Distribute funds
        errorCount = 0;
        while ((await getLastUpdatedTime()).eq(fundsLastAvailableBlockTime)) {
            try {
                console.log(`Distributing daily funds ...`);
                tx = await new ContractExecuteTransaction()
                    .setContractId(AccountId.fromSolidityAddress(TREASURY_VESTER).toString())
                    .setGas(1_200_000)
                    .setFunction('distribute')
                    .execute(client);
                record = await tx.getRecord(client);
                console.log(`Distributing daily funds hash: ${record.transactionId.toString()}`);
                break;
            } catch (error) {
                console.error(`Error attempting distribute()`);
                console.error(error.message);
                if (++errorCount >= 3) {
                    if (isDiscordEnabled) {
                        await Discord.smartContractResult(
                            DISCORD_TOKEN,
                            DISCORD_CHANNEL_ID,
                            {
                                title: 'Distribute Error',
                                color: Discord.Colors.Red,
                                methodTo: TREASURY_VESTER,
                                methodName: `distribute()`,
                                message: error.message,
                                link: Discord.generateAddressLink(WALLET, DISCORD_CHAIN_ID),
                                chainId: DISCORD_CHAIN_ID,
                            },
                        );
                    }
                    throw new Error(`Maximum retry count (${errorCount}) exceeded`);
                }
            }
        }

        // Fetch balance of RewardFundingForwarder
        let pngBalance;
        errorCount = 0;
        while (true) {
            try {
                console.log(`Fetching balance of RewardFundingForwarder (PangoChef) ...`);
                tx = await new ContractInfoQuery()
                    .setContractId(AccountId.fromSolidityAddress(REWARD_FUNDING_FORWARDER).toString())
                    .execute(client);
                const pngBalance = tx.tokenRelationships.get(AccountId.fromSolidityAddress(PNG_HTS_ADDRESS).toString()).balance;
                console.log(`Fetching balance of RewardFundingForwarder (PangoChef): ${pngBalance.toString()}`);
                break;
            } catch (error) {
                console.error(`Error fetching balance of RewardFundingForwarder (PangoChef)`);
                console.error(error.message);
                if (++errorCount >= 3) {
                    if (isDiscordEnabled) {
                        await Discord.smartContractResult(
                            DISCORD_TOKEN,
                            DISCORD_CHANNEL_ID,
                            {
                                title: 'Fetching Balance of RewardFundingForwarder',
                                color: Discord.Colors.Red,
                                message: error.message,
                                link: Discord.generateAddressLink(WALLET, DISCORD_CHAIN_ID),
                                chainId: DISCORD_CHAIN_ID,
                            },
                        );
                    }
                    throw new Error(`Maximum retry count (${errorCount}) exceeded`);
                }
            }
        }

        // Forward funds to PangoChef
        errorCount = 0;
        while (true) {
            try {
                console.log(`Forwarding PangoChef funding ...`);
                tx = await new ContractExecuteTransaction()
                    .setContractId(AccountId.fromSolidityAddress(REWARD_FUNDING_FORWARDER).toString())
                    .setGas(160_000)
                    .setFunction('notifyRewardAmount',
                        new ContractFunctionParameters()
                            .addUint256(pngBalance.toNumber())
                    )
                    .execute(client);
                record = await tx.getRecord(client);
                console.log(`Forwarding PangoChef funding hash: ${record.transactionId.toString()}`);
                break;
            } catch (error) {
                console.error(`Error forwarding PangoChef funding`);
                console.error(error.message);
                if (++errorCount >= 3) {
                    if (isDiscordEnabled) {
                        await Discord.smartContractResult(
                            DISCORD_TOKEN,
                            DISCORD_CHANNEL_ID,
                            {
                                title: 'Forwarding PangoChef Funding',
                                color: Discord.Colors.Red,
                                methodTo: REWARD_FUNDING_FORWARDER,
                                methodName: `notifyRewardAmount(${pngBalance.toString()})`,
                                message: error.message,
                                link: Discord.generateAddressLink(WALLET, DISCORD_CHAIN_ID),
                                chainId: DISCORD_CHAIN_ID,
                            },
                        );
                    }
                    throw new Error(`Maximum retry count (${errorCount}) exceeded`);
                }
            }
        }

        // Forward funds to SSS
        errorCount = 0;
        while (isDiversionEnabled) {
            try {
                console.log(`Forwarding StakingPositions funding ...`);
                tx = await new ContractExecuteTransaction()
                    .setContractId(AccountId.fromSolidityAddress(EMISSION_DIVERSION).toString())
                    .setGas(325_000)
                    .setFunction('claimAndAddReward',
                        new ContractFunctionParameters()
                            .addUint256(parseInt(EMISSION_DIVERSION_PID))
                    )
                    .execute(client);
                record = await tx.getRecord(client);
                console.log(`Forwarding StakingPositions funding hash: ${record.transactionId.toString()}`);
                break;
            } catch (error) {
                console.error(`Error forwarding StakingPositions funding`);
                console.error(error.message);
                if (++errorCount >= 3) {
                    if (isDiscordEnabled) {
                        await Discord.smartContractResult(
                            DISCORD_TOKEN,
                            DISCORD_CHANNEL_ID,
                            {
                                title: 'Forwarding StakingPositions Funding',
                                color: Discord.Colors.Red,
                                methodTo: EMISSION_DIVERSION,
                                methodName: `claimAndAddReward(${EMISSION_DIVERSION_PID})`,
                                message: error.message,
                                link: Discord.generateAddressLink(WALLET, DISCORD_CHAIN_ID),
                                chainId: DISCORD_CHAIN_ID,
                            },
                        );
                    }
                    throw new Error(`Maximum retry count (${errorCount}) exceeded`);
                }
            }
        }

        if (isDiscordEnabled) {
            await Discord.generalAlert(
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
            tx = await new AccountBalanceQuery()
                .setAccountId(myAccountId)
                .execute(client);
            const balance = Web3.utils.toBN(tx.hbars.toTinybars().toString());
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

async function getLastUpdatedTime() {
    const tx = await new ContractCallQuery()
        .setContractId(AccountId.fromSolidityAddress(TREASURY_VESTER).toString())
        .setFunction('lastDistributedTime')
        .setGas(25_000) // 23,363
        .execute(client);
    const lastDistributedTime = tx.getUint256(0);
    return new Web3().utils.toBN(lastDistributedTime.toString());
}

function now() {
    return new Web3().utils.toBN(Date.now());
}

function isSameAddress(a, b) {
    if (!a || !b) return false;
    return a.toLowerCase() === b.toLowerCase();
}