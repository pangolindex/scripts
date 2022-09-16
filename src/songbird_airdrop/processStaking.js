const ABI = require('../../config/abi.json');
const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://sgb.ftso.com.au/ext/bc/C/rpc'));

// Change These Variables
// --------------------------------------------------
const STAKING_POSITIONS = web3.utils.toChecksumAddress('0xcf46391024803368eA169c5F5cE6eDa622Cb577c');
// --------------------------------------------------


// Globals
const STAKE_CACHE = {};
const OWNER_CACHE = {};
let processedBlockRange = 0;
let blockPointer;
let firstBlockWithData;
let lastBlockWithData;


(async () => {
  const startBlock = 22772451; // 22454708;
  const endBlock = 22822511;
  const blockRange = 10000;

  console.log(`Calculating ranges ...`);
  const blockRanges = [];
  blockPointer = startBlock;

  while (blockPointer < endBlock) {
    blockRanges.push([blockPointer, blockPointer += blockRange]);
    blockPointer++;
  }
  blockRanges[blockRanges.length - 1][1] = endBlock;
  console.log(`Calculated ${blockRanges.length} ranges of block size ${blockRange}`);

  console.log();
  console.log(`Fetching events ...`);

  const stakingPositionsContract = new web3.eth.Contract(ABI.STAKING_POSITIONS, STAKING_POSITIONS);

  for (const range of blockRanges) {
    await processTransfer(stakingPositionsContract, range);
    await processStaked(stakingPositionsContract, range);
    await processWithdrawn(stakingPositionsContract, range);
    console.log(`Processed ranges ${++processedBlockRange} of ${blockRanges.length} (${(processedBlockRange / blockRanges.length * 100).toFixed(1)}%)`);
    await sleep(500);
  }

  console.log(`Data found in blocks [${firstBlockWithData} - ${lastBlockWithData}]`);

  // Combine stake and owner data
  const ownerAmounts = {};
  for (const [owner, ids] of Object.entries(OWNER_CACHE)) {
    ownerAmounts[owner] = Array.from(ids).reduce((sum, id) => sum.add(STAKE_CACHE[id]), web3.utils.toBN(0));
  }

  const friendlyResults = Object.entries(ownerAmounts)
    .filter(([owner, amount]) => amount.gtn(0))
    .sort((a, b) => a[1].lt(b[1]) ? 1 : -1)
    .map(([owner, amount]) => ({owner, amount: amount.toString()}));
  const fileOutput = path.join(__dirname, 'output', `staking_${STAKING_POSITIONS}.json`);
  fs.writeFileSync(fileOutput, JSON.stringify(friendlyResults));

  const totalAmount = Object.values(ownerAmounts).reduce((sum, amount) => sum.add(amount), web3.utils.toBN(0));
  console.log(`Total Amount: ${totalAmount.toString()} (${totalAmount.toString() / (10 ** 18)})`);
})()
  .catch(console.error);


async function processStaked(contract, range) {
  // event Staked(uint256 indexed positionId, uint256 indexed amount, uint256 indexed reward);
  const events = await contract.getPastEvents('Staked', {
    fromBlock: range[0],
    toBlock: range[1],
  });
  for (const event of events) {
    if (!firstBlockWithData) {
      firstBlockWithData = event.blockNumber;
      console.log(`First block of data: ${firstBlockWithData}`);
    }
    if (!lastBlockWithData || event.blockNumber > lastBlockWithData) {
      lastBlockWithData = event.blockNumber;
    }

    const pid = event.returnValues.positionId;
    const amount = web3.utils.toBN(event.returnValues.amount);
    if (!firstBlockWithData) firstBlockWithData = event.blockNumber;

    if (STAKE_CACHE[pid]) {
      STAKE_CACHE[pid] = STAKE_CACHE[pid].add(amount);
    } else {
      STAKE_CACHE[pid] = amount;
    }
  }
}

async function processWithdrawn(contract, range) {
  // event Withdrawn(uint256 indexed positionId, uint256 indexed amount, uint256 indexed reward);
  const events = await contract.getPastEvents('Withdrawn', {
    fromBlock: range[0],
    toBlock: range[1],
  });
  for (const event of events) {
    if (!firstBlockWithData) {
      firstBlockWithData = event.blockNumber;
      console.log(`First block of data: ${firstBlockWithData}`);
    }
    if (!lastBlockWithData || event.blockNumber > lastBlockWithData) {
      lastBlockWithData = event.blockNumber;
    }

    const pid = event.returnValues.positionId;
    const amount = web3.utils.toBN(event.returnValues.amount);

    if (STAKE_CACHE[pid]) {
      STAKE_CACHE[pid] = STAKE_CACHE[pid].sub(amount);
    } else {
      STAKE_CACHE[pid] = amount.neg();
    }
  }
}

async function processTransfer(contract, range) {
  // emit Transfer(from, to, tokenId)
  const events = await contract.getPastEvents('Transfer', {
    fromBlock: range[0],
    toBlock: range[1],
  });
  for (const event of events) {
    if (!firstBlockWithData) {
      firstBlockWithData = event.blockNumber;
      console.log(`First block of data: ${firstBlockWithData}`);
    }
    if (!lastBlockWithData || event.blockNumber > lastBlockWithData) {
      lastBlockWithData = event.blockNumber;
    }

    const from = web3.utils.toChecksumAddress(event.returnValues.from);
    const to = web3.utils.toChecksumAddress(event.returnValues.to);
    const id = event.returnValues.tokenId;

    if (from === '0x0000000000000000000000000000000000000000') {
      // Mint
      if (OWNER_CACHE[to]) {
        OWNER_CACHE[to] = OWNER_CACHE[to].add(id);
      } else {
        OWNER_CACHE[to] = new Set([id]);
      }
    } else if (to === '0x0000000000000000000000000000000000000000') {
      // Burn
      OWNER_CACHE[from] = OWNER_CACHE[from].remove(id);
    } else {
      // Transfer
      OWNER_CACHE[from] = OWNER_CACHE[from].remove(id);
      if (OWNER_CACHE[to]) {
        OWNER_CACHE[to] = OWNER_CACHE[to].add(id);
      } else {
        OWNER_CACHE[to] = new Set([id]);
      }
    }
  }
}

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}