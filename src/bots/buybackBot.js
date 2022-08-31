const axios = require('axios');
const path = require('path');
const fs = require('fs');
const Web3 = require('web3');
const ABI = require('../../config/abi.json');


// Variables
// --------------------------------------------------
const RPC = process.env.RPC;
const WALLET = process.env.WALLET;
const KEY = process.env.KEY;
const FEE_COLLECTOR = process.env.FEE_COLLECTOR;
const ROUTER = process.env.ROUTER;
const SUBGRAPH = process.env.SUBGRAPH;
const WRAPPED_NATIVE_CURRENCY = process.env.WRAPPED_NATIVE_CURRENCY;
const PNG = process.env.PNG;
const SLIPPAGE_BIPS = Number.parseInt(process.env.SLIPPAGE_BIPS);
const MAX_GAS = Number.parseInt(process.env.MAX_GAS);
const INTERVAL = Number.parseInt(process.env.INTERVAL);
const INTERVAL_WINDOW = Number.parseInt(process.env.INTERVAL_WINDOW);
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
if (!Web3.utils.isAddress(FEE_COLLECTOR)) {
    throw new Error('Invalid FEE_COLLECTOR');
}
if (!Web3.utils.isAddress(ROUTER)) {
    throw new Error('Invalid ROUTER');
}
if (!SUBGRAPH) {
    throw new Error('Invalid SUBGRAPH');
}
if (!Web3.utils.isAddress(WRAPPED_NATIVE_CURRENCY)) {
    throw new Error('Invalid WRAPPED_NATIVE_CURRENCY');
}
if (!Web3.utils.isAddress(PNG)) {
    throw new Error('Invalid PNG');
}
// --------------------------------------------------


const web3 = new Web3(new Web3.providers.HttpProvider(RPC));
web3.eth.accounts.wallet.add(KEY);

// Globals to manage consistent scheduling with a window of variance
// Do not touch these :)
let executionWindowCenter = Date.now();
let executionDrift = 0;

// Initialize
harvestWrapper();

async function harvestWrapper() {
    harvest()
        .then(scheduleNextHarvest)
        .catch(console.error);
}

async function harvest() {
    const feeCollectorContract = new web3.eth.Contract(ABI.FEE_COLLECTOR, FEE_COLLECTOR);
    const TWO_DECIMAL_LOCALE = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

    const { data: { data: { liquidityPositions } } } = await axios({
        url: SUBGRAPH,
        method: 'post',
        data: {
            query: `query {
                liquidityPositions(
                    first: 1000
                    where: {
                        user: "${FEE_COLLECTOR.toLowerCase()}"
                        liquidityTokenBalance_gt: 0
                    }
                ) {
                    id
                    pair {
                        id
                        reserveUSD
                        reserveETH
                        totalSupply
                    }
                    liquidityTokenBalance
                }
            }`
        }
    });

    const positions = [];

    for (const position of liquidityPositions) {
        if (parseFloat(position.liquidityTokenBalance) === 0) continue;
        if (parseFloat(position.pair.totalSupply) === 0) continue;
        if (parseFloat(position.pair.reserveUSD) === 0) continue;

        const percentOwnership = parseFloat(position.liquidityTokenBalance) / parseFloat(position.pair.totalSupply);

        positions.push({
            pgl: position.pair.id,
            valueUSD: percentOwnership * parseFloat(position.pair.reserveUSD),
            valueAVAX: percentOwnership * parseFloat(position.pair.reserveETH),
        });
    }

    const sortedPositions = positions.sort((a,b) => a.valueUSD > b.valueUSD ? -1 : 1);

    let bestPositions = [];
    let excludedPositionAddresses = [];

    for (let i = 0; i < sortedPositions.length; i++) {
        const acceptedPositions = sortedPositions.slice(0, i + 1).filter(pos => !excludedPositionAddresses.includes(pos.pgl));
        const latestPosition = acceptedPositions[acceptedPositions.length - 1];

        if (latestPosition.valueUSD < 100) {
            break;
        }

        const totalValueUSD = acceptedPositions.reduce((sum, pos) => sum += pos.valueUSD, 0);

        const tx = feeCollectorContract.methods.harvest(
            acceptedPositions.map(p => p.pgl),
            false, // claimMiniChef
            0, // calculate slippage later
        );

        let gas;
        try {
            gas = await tx.estimateGas({ from: WALLET });
        } catch (e) {
            excludedPositionAddresses.push(latestPosition.pgl);
            const friendlyUSD = latestPosition.valueUSD.toLocaleString(undefined, TWO_DECIMAL_LOCALE);
            console.log(`Excluding ${latestPosition.pgl} ($${friendlyUSD}) in buyback due to error estimating harvest()`);
            console.log();
            continue;
        }

        if (gas > MAX_GAS) {
            console.log(`Gas limit exceeded`);
            break;
        }

        const baseGasPrice = await web3.eth.getGasPrice();
        const expectedGasPrice = parseInt(baseGasPrice) + parseInt(web3.utils.toWei('1', 'nano'));
        const expectedGasAVAX = gas * expectedGasPrice / (10 ** 18);

        // Best scenario found
        console.log(`Considering harvesting ${acceptedPositions.length} liquidity positions worth $${totalValueUSD.toLocaleString(undefined, TWO_DECIMAL_LOCALE)}`);
        console.log(`Estimated gas cost of ~${expectedGasAVAX.toLocaleString(undefined, {minimumFractionDigits: 3})} AVAX (${gas})`);
        console.log();

        bestPositions = acceptedPositions;
    }

    if (bestPositions.length === 0) {
        console.log(`No positions found`);
        return;
    }
    console.table(bestPositions.map(p => ({
        pgl: p.pgl,
        value: `$${p.valueUSD.toLocaleString(undefined, TWO_DECIMAL_LOCALE)}`,
    })));

    console.log(`Calculating PNG received and slippage ...`);
    console.log();

    const pngReceived = await calculateReceivedPNG(bestPositions);

    console.log(`Estimated buyback of ${(pngReceived / (10 ** 18)).toLocaleString(undefined, {maximumFractionDigits: 3})} PNG`);
    console.log();

    const tx = feeCollectorContract.methods.harvest(
        bestPositions.map(p => p.pgl),
        false, // claimMiniChef
        pngReceived.muln(10000 - SLIPPAGE_BIPS).divn(10000), // minPng
    );

    console.log(`Encoding bytecode ...`);
    const bytecode = tx.encodeABI();
    const fileName = path.basename(__filename, '.js');
    const fileOutput = path.join(__dirname, `${fileName}-bytecode.txt`);
    fs.writeFileSync(fileOutput, bytecode);
    console.log(`Encoded bytecode to ${fileOutput}`);
    console.log();

    let receipt;

    const gas = await tx.estimateGas({ from: WALLET });
    const baseGasPrice = await web3.eth.getGasPrice();

    console.log('Sending harvest() ...');
    receipt = await tx.send({
        from: WALLET,
        gas: gas,
        maxFeePerGas: baseGasPrice * 2,
        maxPriorityFeePerGas: web3.utils.toWei('1', 'nano'),
    });

    if (!receipt?.status) {
        console.log(receipt);
        process.exit(1);
    } else {
        console.log(`Transaction hash: ${receipt.transactionHash}`);
    }

    console.log();
}

function scheduleNextHarvest() {
    // Avoid potentially scheduling in the past
    if (INTERVAL_WINDOW >= INTERVAL) throw new Error(`Interval window is too large`);

    executionWindowCenter += INTERVAL;
    executionDrift = randomIntFromInterval(-1 * INTERVAL_WINDOW, INTERVAL_WINDOW);
    const now = Date.now();
    const delay = executionWindowCenter - now + executionDrift;
    console.log();
    console.log(`New execution window: ${new Date(executionWindowCenter - INTERVAL_WINDOW).toLocaleTimeString()} - ${new Date(executionWindowCenter + INTERVAL_WINDOW).toLocaleTimeString()}`);
    console.log(`Scheduled next harvest() for ${new Date(now + delay).toLocaleString()}`);
    console.log();

    setTimeout(harvestWrapper, delay);
}

function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

async function calculateReceivedPNG(positions) {
    let pngReceived = web3.utils.toBN(0);

    const positionInfos = await Promise.all(positions.map(getPositionInfo));

    for (const [ pglOwned, pglTotal, { reserve0, reserve1 }, token0, token1 ] of positionInfos) {
        const token0Amount = pglOwned.mul(reserve0).div(pglTotal);
        const token1Amount = pglOwned.mul(reserve1).div(pglTotal);

        if (token0 !== PNG) {
            pngReceived.iadd(await estimateSwap(token0, PNG, token0Amount));
        } else {
            pngReceived.iadd(token0Amount);
        }

        if (token1 !== PNG) {
            pngReceived.iadd(await estimateSwap(token1, PNG, token1Amount));
        } else {
            pngReceived.iadd(token1Amount);
        }
    }

    return pngReceived;
}

function getPositionInfo(position) {
    const pglContract = new web3.eth.Contract(ABI.PAIR, position.pgl);
    return Promise.all([
        pglContract.methods.balanceOf(FEE_COLLECTOR).call().then(web3.utils.toBN),
        pglContract.methods.totalSupply().call().then(web3.utils.toBN),
        pglContract.methods.getReserves().call()
            .then(({_reserve0, _reserve1}) => ({
                reserve0: web3.utils.toBN(_reserve0),
                reserve1: web3.utils.toBN(_reserve1),
            })),
        pglContract.methods.token0().call(),
        pglContract.methods.token1().call(),
    ]);
}

async function estimateSwap(token, outputToken, amount) {
    const router = new web3.eth.Contract(ABI.ROUTER, ROUTER);

    if (token === WRAPPED_NATIVE_CURRENCY || outputToken === WRAPPED_NATIVE_CURRENCY) {
        const amountsOut = await router.methods.getAmountsOut(amount, [token, outputToken]).call();
        return web3.utils.toBN(amountsOut[1]);
    } else {
        const amountsOut = await router.methods.getAmountsOut(amount, [token, WRAPPED_NATIVE_CURRENCY, outputToken]).call();
        return web3.utils.toBN(amountsOut[2]);
    }
}
