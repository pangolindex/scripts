const {Client, ContractExecuteTransaction, AccountId, ContractFunctionParameters, ContractInfoQuery, PrivateKey, ContractCallQuery} = require('@hashgraph/sdk');
const Web3 = require('web3');

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
if (!EMISSION_DIVERSION || !Web3.utils.isAddress(EMISSION_DIVERSION)) {
    throw new Error('Invalid EMISSION_DIVERSION');
}
if (Number.isInteger(EMISSION_DIVERSION_PID)) {
    throw new Error('Invalid EMISSION_DIVERSION_PID');
}
// --------------------------------------------------


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
  .catch(error => {
      console.error(error);
      process.exit(1);
  });

async function main() {
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
            await sleep(delay.add(SECOND));
        }

        // Distribute funds
        let errorCount = 0;
        while ((await getLastUpdatedTime()).eq(fundsLastAvailableBlockTime)) {
            try {
                console.log(`Sending distribute() ...`);
                tx = await new ContractExecuteTransaction()
                    .setContractId(AccountId.fromSolidityAddress(TREASURY_VESTER).toString())
                    .setGas(1_200_000)
                    .setFunction('distribute')
                    .execute(client);
                receipt = await tx.getReceipt(client);
                record = await tx.getRecord(client);
                console.log(`Vest transaction hash: ${record.transactionId.toString()}`);
                break;
            } catch (error) {
                console.error(`Error attempting distribute()`);
                console.error(error.message);
                if (++errorCount >= 5) {
                    throw new Error(`Maximum retry count (${errorCount}) exceeded`);
                }
            }
        }

        console.log(`Fetching balance of RewardFundingForwarder (PangoChef) ...`);
        tx = await new ContractInfoQuery()
            .setContractId(AccountId.fromSolidityAddress(REWARD_FUNDING_FORWARDER).toString())
            .execute(client);
        const pngBalance = tx.tokenRelationships.get(AccountId.fromSolidityAddress(PNG_HTS_ADDRESS).toString()).balance;
        console.log(`Found PNG balance: ${pngBalance.toString()}`);

        console.log(`Forwarding PangoChef funding ...`);
        tx = await new ContractExecuteTransaction()
            .setContractId(AccountId.fromSolidityAddress(REWARD_FUNDING_FORWARDER).toString())
            .setGas(160_000)
            .setFunction('notifyRewardAmount',
                new ContractFunctionParameters()
                    .addUint256(pngBalance.toNumber())
            )
            .execute(client);
        receipt = await tx.getReceipt(client);
        console.log(`Forwarded PangoChef funding!`);

        console.log(`Forwarding StakingPositions funding ...`);
        tx = await new ContractExecuteTransaction()
            .setContractId(AccountId.fromSolidityAddress(EMISSION_DIVERSION).toString())
            .setGas(320_000)
            .setFunction('claimAndAddReward',
                new ContractFunctionParameters()
                    .addUint256(parseInt(EMISSION_DIVERSION_PID))
            )
            .execute(client);
        receipt = await tx.getReceipt(client);
        console.log(`Forwarded StakingPositions funding!`);
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
