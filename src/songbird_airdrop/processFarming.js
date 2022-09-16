const ABI = require('../../config/abi.json');
const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://sgb.ftso.com.au/ext/bc/C/rpc'));

// Change These Variables
// --------------------------------------------------
const PANGO_CHEF = web3.utils.toChecksumAddress('0x482FC8A1d418e3C4BC73C0E7fE0fA62eAB0df8dc');
const PID = 0; // WSGB-PSB
// --------------------------------------------------


// Globals
const CACHE = {};
let processedBlockRange = 0;
let blockPointer;
let firstBlockWithData;
let lastBlockWithData;


(async () => {
    const startBlock = 22773589; // pango chef deployed at 22454659;
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

    const pangoChefContract = new web3.eth.Contract(ABI.PANGO_CHEF, PANGO_CHEF);

    console.log();
    console.log('Fetching pair information ...');
    const poolInfo = await pangoChefContract.methods.pools(PID).call();
    const pairAddress = web3.utils.toChecksumAddress(poolInfo.tokenOrRecipient);
    const pairContract = new web3.eth.Contract(ABI.PAIR, pairAddress);
    const [ token0, token1 ] = await Promise.all([
        pairContract.methods.token0().call().then(addr => web3.utils.toChecksumAddress(addr)),
        pairContract.methods.token1().call().then(addr => web3.utils.toChecksumAddress(addr)),
    ]);
    console.log(`Found pair information of ${token0} and ${token1}`);

    console.log();
    console.log(`Fetching events ...`);

    for (const range of blockRanges) {
        await processStaked(pangoChefContract, PID, range);
        await processWithdrawn(pangoChefContract, PID, range);
        console.log(`Processed ranges ${++processedBlockRange} of ${blockRanges.length} (${(processedBlockRange / blockRanges.length * 100).toFixed(1)}%)`);
        await sleep(500);
    }

    console.log(`Data found in blocks ${firstBlockWithData} - ${lastBlockWithData}`);

    const totalSupply = Object.values(CACHE).reduce((sum, amount) => sum.add(amount), web3.utils.toBN(0));
    console.log(`Total Supply: ${totalSupply.toString()} (${totalSupply.toString() / (10 ** 18)})`);

    console.log(`Calculating LP value ...`);
    const { reserve0, reserve1 } = await getPairReservesAtBlock(pairAddress, endBlock, blockRange);
    const friendlyFullResults = Object.entries(CACHE)
      .filter(([owner, amount]) => amount.gtn(0))
      .sort((a, b) => a[1].lt(b[1]) ? 1 : -1)
      .map(([owner, amount]) => ({
          owner,
          lp: amount.toString(),
          token0: reserve0.mul(amount).div(totalSupply).toString(),
          token1: reserve1.mul(amount).div(totalSupply).toString(),
      }));
    const fileOutput = path.join(__dirname, 'output', `farming_${PANGO_CHEF}-${PID}.json`);
    fs.writeFileSync(fileOutput, JSON.stringify(friendlyFullResults));
    console.log('Successfully calculated LP value');

    console.log(`Total ${token0}: ${reserve0.toString()}`);
    console.log(`Total ${token1}: ${reserve1.toString()}`);
})()
  .catch(console.error);


async function processStaked(contract, pid, range) {
    // event Staked(
    //     uint256 indexed positionId,
    //     address indexed userId,
    //     uint256 indexed amount,
    //     uint256 reward
    // );
    const events = await contract.getPastEvents('Staked', {
        fromBlock: range[0],
        toBlock: range[1],
        filter: {
            positionId: pid.toString(),
        },
    });
    for (const event of events) {
        if (!firstBlockWithData) {
            firstBlockWithData = event.blockNumber;
            console.log(`First block of data: ${firstBlockWithData}`);
        }
        if (!lastBlockWithData || event.blockNumber > lastBlockWithData) {
            lastBlockWithData = event.blockNumber;
        }

        const user = web3.utils.toChecksumAddress(event.returnValues.userId);
        const amount = web3.utils.toBN(event.returnValues.amount);
        if (!firstBlockWithData) firstBlockWithData = event.blockNumber;

        if (CACHE[user]) {
            CACHE[user] = CACHE[user].add(amount);
        } else {
            CACHE[user] = amount;
        }
    }
}

async function processWithdrawn(contract, pid, range) {
    // event Withdrawn(
    //     uint256 indexed positionId,
    //     address indexed userId,
    //     uint256 indexed amount,
    //     uint256 reward
    // );
    const events = await contract.getPastEvents('Withdrawn', {
        fromBlock: range[0],
        toBlock: range[1],
        filter: {
            positionId: pid.toString(),
        },
    });
    for (const event of events) {
        if (!firstBlockWithData) {
            firstBlockWithData = event.blockNumber;
            console.log(`First block of data: ${firstBlockWithData}`);
        }
        if (!lastBlockWithData || event.blockNumber > lastBlockWithData) {
            lastBlockWithData = event.blockNumber;
        }

        const user = web3.utils.toChecksumAddress(event.returnValues.userId);
        const amount = web3.utils.toBN(event.returnValues.amount);

        if (CACHE[user]) {
            CACHE[user] = CACHE[user].sub(amount);
        } else {
            CACHE[user] = amount.neg();
        }
    }
}

async function getPairReservesAtBlock(pairAddress, blockNumber, blockRange = 2048) {
    const pairContract = new web3.eth.Contract(ABI.PAIR, pairAddress);

    let blockPointer = Number.parseInt(blockNumber);
    let events = [];

    while (events.length === 0) {
        // event Sync(uint112 reserve0, uint112 reserve1);
        events = await pairContract.getPastEvents('Sync', {
            fromBlock: blockPointer - blockRange,
            toBlock: blockPointer,
        });
        blockPointer = blockPointer - blockRange - 1;
    }

    const lastEvent = events[events.length - 1];

    return {
        reserve0: web3.utils.toBN(lastEvent.returnValues.reserve0),
        reserve1: web3.utils.toBN(lastEvent.returnValues.reserve1),
    };
}

async function sleep(ms) {
    await new Promise(resolve => setTimeout(resolve, ms));
}