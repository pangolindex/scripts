const CONFIG = require('../../config/config');
const ADDRESS = require('../../config/address.json');
const ABI = require('../../config/abi.json');
const MiniChefV2 = require('@pangolindex/exchange-contracts/artifacts/contracts/mini-chef/MiniChefV2.sol/MiniChefV2.json');
const RewarderViaMultiplier = require('@pangolindex/exchange-contracts/artifacts/contracts/mini-chef/RewarderViaMultiplier.sol/RewarderViaMultiplier.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));

// Change these variables
// -----------------------------------------------------------------
const pid = 87; // PID of the farm in MiniChef
const miniChefAddress = ADDRESS.PANGOLIN_MINICHEF_V2_ADDRESS;

const startBlock = 11006689; // Block before the SuperFarm (use Rewarder deployment block for simplicity)
const blockRange = 2048; // Number of block events to fetch per batch
// -----------------------------------------------------------------


const usersWhoDeposited = new Set();
const usersWithPending = new Set();
const blockRanges = [];
let processedRangeCount = 0;
let processedUserCount = 0;
const chefContract = new web3.eth.Contract(MiniChefV2.abi, miniChefAddress.toLowerCase());

(async () => {
  const poolCount = parseInt(await chefContract.methods.poolLength().call());
  if (pid < 0 || pid >= poolCount) {
    throw new Error(`Invalid PID ${pid}`);
  }
  const rewarderAddress = await chefContract.methods.rewarder(pid).call();
  const rewarderContract = new web3.eth.Contract(RewarderViaMultiplier.abi, rewarderAddress.toLowerCase());
  const rewardAddresses = await rewarderContract.methods.getRewardTokens().call();

  const rewardInfo = {};

  for (const rewardAddress of rewardAddresses) {
    const contract = new web3.eth.Contract(ABI.TOKEN, rewardAddress.toLowerCase());
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

  let outstandingPendingPNG = 0;
  const outstandingBalances = rewardAddresses.reduce((map, addr) => ({...map, [addr]: {}}), {});
  const outstandingBalanceTotals = rewardAddresses.reduce((map, addr) => ({...map, [addr]: 0}), {});

  console.log(`Users:`);
  console.log(usersWhoDeposited);

  console.log();
  console.log(`Fetching pending balances for ${usersWhoDeposited.size} users ...`);

  for (const userAddress of usersWhoDeposited) {
    let pendingPNG = 0;
    try {
      pendingPNG = await chefContract.methods.pendingReward(pid, userAddress).call();
      if (pendingPNG > 0) usersWithPending.add(userAddress);
      outstandingPendingPNG += parseInt(pendingPNG);
    } catch (e) {
      console.error(`${e.message} (${userAddress})`);
    }
    const pendingTokensDebtResult = await rewarderContract.methods.pendingTokensDebt(pid, userAddress, pendingPNG).call();
    if (++processedUserCount % 50 === 0 || processedUserCount === usersWhoDeposited.size) {
      console.log(`Processed ${processedUserCount} of ${usersWhoDeposited.size} users (${(processedUserCount / usersWhoDeposited.size * 100).toFixed(1)}%)`);
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

  console.log(`Identified ${outstandingPendingPNG / (10 ** 18)} outstanding claimable PNG from ${usersWithPending.size} users`);

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
      usersWhoDeposited.add(to);
    }
  }
  console.log(`Processed ranges ${++processedRangeCount} of ${blockRanges.length} (${(processedRangeCount / blockRanges.length * 100).toFixed(1)}%)`);
}
