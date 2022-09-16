const ABI = require('../../config/abi.json');
const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://sgb.ftso.com.au/ext/bc/C/rpc'));

// Change These Variables
// --------------------------------------------------
const TOKEN_ADDRESS = web3.utils.toChecksumAddress('0x3AAD4eE30d41525c2Ee7D0F4070ebF31568F31b4');
const EXCLUDED_ADDRESSES = new Set([
  '0x0f6e8806ddD77bB0d753d8b0D820c62Df16344aE', // WSGB-PSB Pair
  '0xcf46391024803368eA169c5F5cE6eDa622Cb577c', // Staking
  '0x4DbD504D19ce7557b9F88091199b9a1Cfe8c5F72', // Treasury
  '0x56a7F4597D8ee5d4Af13f7063b507E4Dc7D0099c', // Multisig
  '0xa3ffE2CE452C23941b62B5D570f36b823E1e0D0F', // Merkledrop
  '0x59fcf99d02F3055d2109b1951d166788EfC0EA47', // Pangolin Wallet
].map(web3.utils.toChecksumAddress));
// --------------------------------------------------


// Globals
const CACHE = {};
let processedBlockRange = 0;
let blockPointer;
let firstBlockWithData;
let lastBlockWithData;


(async () => {
  const startBlock = 22454598;
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

  const tokenContract = new web3.eth.Contract(ABI.TOKEN, TOKEN_ADDRESS);

  for (const range of blockRanges) {
    await processTransfer(tokenContract, range);
    console.log(`Processed ranges ${++processedBlockRange} of ${blockRanges.length} (${(processedBlockRange / blockRanges.length * 100).toFixed(1)}%)`);
    await sleep(500);
  }

  console.log(`Data found in blocks [${firstBlockWithData} - ${lastBlockWithData}]`);

  const friendlyResults = Object.entries(CACHE)
    .filter(([owner, amount]) => amount.gtn(0))
    .sort((a, b) => a[1].lt(b[1]) ? 1 : -1)
    .map(([owner, amount]) => ({owner, amount: amount.toString()}));
  const fileOutput = path.join(__dirname, 'output', `holding_${TOKEN_ADDRESS}.json`);
  fs.writeFileSync(fileOutput, JSON.stringify(friendlyResults));

  const totalAmount = Object.values(CACHE).reduce((sum, amount) => sum.add(amount), web3.utils.toBN(0));
  console.log(`Total Amount: ${totalAmount.toString()} (${totalAmount.toString() / (10 ** 18)})`);
})()
  .catch(console.error);


async function processTransfer(contract, range) {
  // event Transfer(address indexed from, address indexed to, uint value);
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
    const amount = web3.utils.toBN(event.returnValues.value);

    if (from !== '0x0000000000000000000000000000000000000000' && !EXCLUDED_ADDRESSES.has(from)) {
      if (CACHE[from]) {
        CACHE[from] = CACHE[from].sub(amount);
      } else {
        CACHE[from] = amount.neg();
      }
    }
    if (to !== '0x0000000000000000000000000000000000000000' && !EXCLUDED_ADDRESSES.has(to)) {
      if (CACHE[to]) {
        CACHE[to] = CACHE[to].add(amount);
      } else {
        CACHE[to] = amount;
      }
    }
  }
}

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}