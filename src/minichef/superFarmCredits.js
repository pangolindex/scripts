const ABI = require('../../config/abi');
const ADDRESS = require('../../config/address');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));

// Change these variables
// -----------------------------------------------------------------
const pid = 87; // PID of the farm in MiniChef

const startBlock = 11006689; // Block before the SuperFarm (use Rewarder deployment block for simplicity)
const blockRange = 2048; // Number of block events to fetch per batch
// -----------------------------------------------------------------


const users = new Set();
const blockRanges = [];
let processedRangeCount = 0;
let processedUserCount = 0;
const chefContract = new web3.eth.Contract(ABI.MINICHEF_V2, ADDRESS.PANGOLIN_MINICHEF_V2_ADDRESS);

(async () => {
  const poolCount = parseInt(await chefContract.methods.poolLength().call());
  if (pid < 0 || pid >= poolCount) {
    throw new Error(`Invalid PID ${pid}`);
  }
  const rewarderAddress = await chefContract.methods.rewarder(pid).call();
  const rewarderContract = new web3.eth.Contract(ABI.REWARDER_VIA_MULTIPLIER, rewarderAddress);
  const rewardAddresses = await rewarderContract.methods.getRewardTokens().call();

  const rewardInfo = {};

  for (const rewardAddress of rewardAddresses) {
    const contract = new web3.eth.Contract(ABI.TOKEN, rewardAddress);
    const [ symbol, decimals ] = await Promise.all([
      contract.methods.symbol().call(),
      contract.methods.decimals().call()
    ]);
    rewardInfo[rewardAddress] = {
      contract,
      symbol,
      decimals: parseInt(decimals),
    };
  }

  const endBlock = await web3.eth.getBlockNumber();
  let block = startBlock;

  console.log(`Calculating ranges ...`);

  while (block < endBlock) {
    blockRanges.push([block, block += blockRange]);
    block++;
  }
  blockRanges[blockRanges.length - 1][1] = endBlock;
  console.log(`Calculated ${blockRanges.length} ranges of block size ${blockRange}`);

  console.log();
  console.log(`Fetching events ...`);

  for (const range of blockRanges) {
    await processRange(range);
  }

  const outstandingBalances = rewardAddresses.reduce((map, addr) => ({...map, [addr]: {}}), {});
  const outstandingBalanceTotals = rewardAddresses.reduce((map, addr) => ({...map, [addr]: 0}), {});

  console.log(`Users:`);
  console.log(users);

  console.log();
  console.log(`Fetching pending balances for ${users.size} users ...`);

  for (const userAddress of users) {
    let pendingPNG = 0;
    try {
      pendingPNG = await chefContract.methods.pendingReward(pid, userAddress).call();
    } catch (e) {
      console.error(`${e.message} (${userAddress})`);
    }
    const pendingTokensDebtResult = await rewarderContract.methods.pendingTokensDebt(pid, userAddress, pendingPNG).call();
    if (++processedUserCount % 50 === 0 || processedUserCount === users.size) {
      console.log(`Processed ${processedUserCount} of ${users.size} users (${(processedUserCount / users.size * 100).toFixed(1)}%)`);
    }
    for (let i = 0; i < pendingTokensDebtResult.tokens.length; i++) {
      const token = pendingTokensDebtResult.tokens[i];
      const amount = parseInt(pendingTokensDebtResult.amounts[i]);
      outstandingBalances[token][userAddress] = amount;
      outstandingBalanceTotals[token] += amount;
    }
  }

  for (const [token, balances] of Object.entries(outstandingBalances)) {
    const nonZeroBalances = Object.entries(balances).filter(([user, bal]) => bal > 0);
    const sorted = nonZeroBalances.sort(([userA, amountA], [userB, amountB]) => amountB > amountA ? 1 : -1);
    console.log();
    console.log(`${outstandingBalanceTotals[token] / (10 ** rewardInfo[token].decimals)} unclaimed ${rewardInfo[token].symbol} by ${nonZeroBalances.length} users:`);
    for (const [user, balance] of sorted) {
      console.log(`${user}: ${balance / (10 ** rewardInfo[token].decimals)}`);
    }
  }

  console.log();

  for (const [token, amount] of Object.entries(outstandingBalanceTotals)) {
    console.log(`Identified ${amount / (10 ** rewardInfo[token].decimals)} outstanding claimable ${rewardInfo[token].symbol}`);
  }

})()
  .catch(console.error)
  .then(process.exit);


async function processRange(range) {
  // Deposit(msg.sender, pid, amount, to)
  const events = await chefContract.getPastEvents('Deposit', {
    fromBlock: range[0],
    toBlock: range[1],
    filter: {
      pid: pid.toString(),
    },
  });
  for (const event of events) {
    if (parseInt(event.returnValues.amount) > 0) {
      const to = web3.utils.toChecksumAddress(event.returnValues.to);
      users.add(to);
    }
  }
  console.log(`Processed ranges ${++processedRangeCount} of ${blockRanges.length} (${(processedRangeCount / blockRanges.length * 100).toFixed(1)}%)`);
}
