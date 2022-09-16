const ABI = require('../../config/abi.json');
const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://sgb.ftso.com.au/ext/bc/C/rpc'));

// Change These Variables
// --------------------------------------------------
const PAIR_ADDRESS = web3.utils.toChecksumAddress('0x0f6e8806ddD77bB0d753d8b0D820c62Df16344aE'); // WSGB-PSB
const EXCLUDED_ADDRESSES = new Set([
    '0x0f6e8806ddD77bB0d753d8b0D820c62Df16344aE', // WSGB-PSB Pair
    '0x482FC8A1d418e3C4BC73C0E7fE0fA62eAB0df8dc', // PangoChef
    '0x0B1C4A4D658657D00a0CA7087ad152a9d29309B6', // FeeCollector
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
    const startBlock = 22772359; // pair deployed at 22454659;
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

    const pairContract = new web3.eth.Contract(ABI.PAIR, PAIR_ADDRESS);

    console.log();
    console.log('Fetching pair information ...');
    const [ token0, token1 ] = await Promise.all([
        pairContract.methods.token0().call().then(addr => new web3.eth.Contract(ABI.TOKEN, addr).methods.symbol().call()),
        pairContract.methods.token1().call().then(addr => new web3.eth.Contract(ABI.TOKEN, addr).methods.symbol().call()),
    ]);
    console.log(`Found pair information of ${token0}-${token1}`);

    console.log();
    console.log(`Fetching events ...`);

    for (const range of blockRanges) {
        await processTransfer(pairContract, range);
        console.log(`Processed ranges ${++processedBlockRange} of ${blockRanges.length} (${(processedBlockRange / blockRanges.length * 100).toFixed(1)}%)`);
        await sleep(500);
    }

    console.log(`Data found in blocks [${firstBlockWithData} - ${lastBlockWithData}]`);

    const totalSupply = Object.values(CACHE).reduce((sum, amount) => sum.add(amount), web3.utils.toBN(0));
    console.log(`Total Supply: ${totalSupply.toString()} (${totalSupply.toString() / (10 ** 18)})`);

    console.log(`Calculating LP value ...`);
    const { reserve0, reserve1 } = await getPairReservesAtBlock(PAIR_ADDRESS, endBlock, blockRange);
    const friendlyResults = Object.entries(CACHE)
      .filter(([owner, amount]) => amount.gtn(0))
      .sort((a, b) => a[1].lt(b[1]) ? 1 : -1)
      .map(([owner, amount]) => ({
          owner,
          lp: amount.toString(),
          token0: reserve0.mul(amount).div(totalSupply).toString(),
          token1: reserve1.mul(amount).div(totalSupply).toString(),
      }));
    console.log('Successfully calculated LP value');

    const fileOutput = path.join(__dirname, 'output', `lping_${PAIR_ADDRESS}.json`);
    fs.writeFileSync(fileOutput, JSON.stringify(friendlyResults));

    console.log(`Total ${token0}: ${reserve0.toString()} (${reserve0.toString() / (10 ** 18)})`);
    console.log(`Total ${token1}: ${reserve1.toString()} (${reserve1.toString() / (10 ** 18)})`);
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