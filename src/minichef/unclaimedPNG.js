const ABI = require('../../config/abi');
const ADDRESS = require('../../config/address');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));

// Change these variables
// -----------------------------------------------------------------
const pid = 100; // PID of the farm in MiniChef

const startBlock = 12683488; // Block before the PGL (use PGL creation block for simplicity)
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

  const endBlock = await web3.eth.getBlockNumber();
  let block = startBlock;

  console.log(`Calculating ranges ...`);

  while (block < endBlock) {
    blockRanges.push([block, (block += blockRange) - 1]);
  }
  blockRanges[blockRanges.length - 1][1] = endBlock;
  console.log(`Calculated ${blockRanges.length} ranges of block size ${blockRange}`);

  console.log();
  console.log(`Fetching events ...`);

  for (const range of blockRanges) {
    await processRange(range);
  }

  console.log();
  console.log(`Processing ${users.size} users ...`);

  let outstandingBal = 0;

  for (const userAddress of users) {
    const pendingBal = parseInt(await chefContract.methods.pendingReward(pid, userAddress).call());
    outstandingBal += pendingBal;
    if (++processedUserCount % 50 === 0 || processedUserCount === users.size) {
      console.log(`Processed ${processedUserCount} of ${users.size} users (${(processedUserCount / users.size * 100).toFixed(1)}%)`);
    }
  }

  console.log();
  console.log(`Identified ${outstandingBal / (10 ** 18)} outstanding claimable PNG`);
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
