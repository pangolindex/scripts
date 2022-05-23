const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const CONSTANTS = require('../core/constants');
const { propose: gnosisMultisigPropose } = require('../core/gnosisMultisig');
const { propose: gnosisSafePropose } = require('../core/gnosisSafe');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
let startingAvax;
let endingAvax;


// Change These Variables
// --------------------------------------------------
const MIN_PROFIT_AVAX = 0.05;
const SLIPPAGE_BIPS = 500; // 5%
const sender = ADDRESS.PANGOLIN_GNOSIS_SAFE_ADDRESS;
const senderType = CONSTANTS.EOA;
const bytecodeOnly = true;
// --------------------------------------------------


(async () => {
    startingAvax = await web3.eth.getBalance(CONFIG.WALLET.ADDRESS);

    const feeCollectorContract = new web3.eth.Contract(ABI.FEE_COLLECTOR, ADDRESS.FEE_COLLECTOR);
    const harvestIncentive = parseInt(await feeCollectorContract.methods.harvestIncentive().call());
    const feeDenominator = parseInt(await feeCollectorContract.methods.FEE_DENOMINATOR().call());
    const TWO_DECIMAL_LOCALE = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

    const { data: { data: { liquidityPositions } } } = await axios({
        url: 'https://api.thegraph.com/subgraphs/name/pangolindex/exchange',
        method: 'post',
        data: {
            query: `query {
                liquidityPositions(
                    first: 1000
                    where: {
                        user: "${ADDRESS.FEE_COLLECTOR.toLowerCase()}"
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

    let bestProfit = 0;
    let bestPositions = [];
    let excludedPositions = [];

    for (let i = 0; i < sortedPositions.length; i++) {
        const excludedPositionAddresses = excludedPositions.map(pos => pos.pgl);
        const acceptedPositions = sortedPositions.slice(0, i + 1).filter(pos => !excludedPositionAddresses.includes(pos.pgl));

        const totalValueUSD = acceptedPositions.reduce((sum, pos) => sum += pos.valueUSD, 0);
        const totalValueAVAX = acceptedPositions.reduce((sum, pos) => sum += pos.valueAVAX, 0);
        const harvestIncentiveValueUSD = totalValueUSD * (harvestIncentive / feeDenominator);
        const harvestIncentiveValueAVAX = totalValueAVAX * (harvestIncentive / feeDenominator);

        const tx = feeCollectorContract.methods.harvest(
            acceptedPositions.map(p => p.pgl),
            false, // claimMiniChef
            0, // calculate slippage later
        );

        let gas;
        try {
            gas = await tx.estimateGas({ from: sender });
        } catch (e) {
            const latestPosition = acceptedPositions[acceptedPositions.length - 1];
            excludedPositions.push(latestPosition);
            console.error(`Excluding ${latestPosition.pgl} in buyback due to error estimating harvest()`);
            console.log();
            continue;
        }
        const baseGasPrice = await web3.eth.getGasPrice();
        const expectedGasPrice = parseInt(baseGasPrice) + parseInt(web3.utils.toWei('2', 'nano'));
        const expectedGasAVAX = gas * expectedGasPrice / (10 ** 18);
        const expectedProfit = harvestIncentiveValueAVAX - expectedGasAVAX;

        if (expectedProfit >= bestProfit) {
            // Best scenario found
            console.log(`Considering harvesting ${acceptedPositions.length} liquidity positions worth $${totalValueUSD.toLocaleString(undefined, TWO_DECIMAL_LOCALE)}`);
            console.log(`Estimated incentive of $${harvestIncentiveValueUSD.toLocaleString(undefined, TWO_DECIMAL_LOCALE)} (${harvestIncentiveValueAVAX.toLocaleString(undefined, {maximumFractionDigits: 3})} AVAX)`);
            console.log(`Estimated gas cost of ~${expectedGasAVAX.toLocaleString(undefined, {minimumFractionDigits: 3})} AVAX`);
            console.log();

            bestPositions = acceptedPositions;
            bestProfit = expectedProfit;
        } else {
            // Previous scenario was best
            console.table(bestPositions.map(p => ({
                pgl: p.pgl,
                value: `$${p.valueUSD.toLocaleString(undefined, TWO_DECIMAL_LOCALE)}`,
            })));
            break;
        }
    }

    // Short circuit when threshold not met
    if (bestProfit < MIN_PROFIT_AVAX) {
        console.log(`No profitable harvests detected`);
        return;
    }

    console.log(`Calculating PNG received and slippage ...`);
    console.log();

    const pngReceived = await calculateReceivedPNG(bestPositions);

    console.log(`Estimated buyback of ${(pngReceived / (10 ** 18)).toLocaleString(undefined, {maximumFractionDigits: 3})} PNG`);
    console.log();

    const [ currentAPR, newAPR ] = await estimateAPRs(pngReceived);

    console.log(`Expected APR change from ${currentAPR.toNumber().toFixed()}% to ${newAPR.toNumber().toFixed()}%`);
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

    if (bytecodeOnly) {
        console.log(`Skipping execution due to "bytecodeOnly" flag`);
        return;
    }

    let receipt;

    switch (senderType) {
        case CONSTANTS.GNOSIS_MULTISIG:
            console.log(`Proposing via gnosis multisig ...`);
            receipt = await gnosisMultisigPropose({
                multisigAddress: sender,
                destination: ADDRESS.FEE_COLLECTOR,
                value: 0,
                bytecode,
            });

            if (!receipt?.status) {
                console.log(receipt);
                process.exit(1);
            } else {
                console.log(`Transaction hash: ${snowtraceLink(receipt.transactionHash)}`);
            }
            break;
        case CONSTANTS.GNOSIS_SAFE:
            console.log(`Proposing via gnosis safe ...`);
            await gnosisSafePropose({
                multisigAddress: sender,
                destination: ADDRESS.FEE_COLLECTOR,
                value: 0,
                bytecode,
            });
            break;
        case CONSTANTS.EOA:
            const gas = await tx.estimateGas({ from: sender });
            const baseGasPrice = await web3.eth.getGasPrice();

            console.log('Sending harvest() via EOA ...');
            receipt = await tx.send({
                from: sender,
                gas: gas,
                maxFeePerGas: baseGasPrice * 2,
                maxPriorityFeePerGas: web3.utils.toWei('2', 'nano'),
            });

            if (!receipt?.status) {
                console.log(receipt);
                process.exit(1);
            } else {
                console.log(`Transaction hash: ${snowtraceLink(receipt.transactionHash)}`);
            }
            break;
        default:
            throw new Error(`Unknown sender type: ${senderType}`);
    }

    console.log();
})()
  .catch(console.error)
  .finally(async () => {
      endingAvax = await web3.eth.getBalance(CONFIG.WALLET.ADDRESS);
      console.log(`AVAX spent: ${(startingAvax - endingAvax) / (10 ** 18)}`);
      process.exit(0);
  });

function snowtraceLink(hash) {
    return `https://snowtrace.io/tx/${hash}`;
}

async function calculateReceivedPNG(positions) {
    let pngReceived = web3.utils.toBN(0);

    const positionInfos = await Promise.all(positions.map(getPositionInfo));

    for (const [ pglOwned, pglTotal, { reserve0, reserve1 }, token0, token1 ] of positionInfos) {
        const token0Amount = pglOwned.mul(reserve0).div(pglTotal);
        const token1Amount = pglOwned.mul(reserve1).div(pglTotal);

        if (token0 !== ADDRESS.PNG) {
            pngReceived.iadd(await estimateSwap(token0, ADDRESS.PNG, token0Amount));
        } else {
            pngReceived.iadd(token0Amount);
        }

        if (token1 !== ADDRESS.PNG) {
            pngReceived.iadd(await estimateSwap(token1, ADDRESS.PNG, token1Amount));
        } else {
            pngReceived.iadd(token1Amount);
        }
    }

    return pngReceived;
}

function getPositionInfo(position) {
    const pglContract = new web3.eth.Contract(ABI.PAIR, position.pgl);
    return Promise.all([
        pglContract.methods.balanceOf(ADDRESS.FEE_COLLECTOR).call().then(web3.utils.toBN),
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
    const router = new web3.eth.Contract(ABI.ROUTER, ADDRESS.PANGOLIN_ROUTER);

    if (token === ADDRESS.WAVAX) {
        const amountsOut = await router.methods.getAmountsOut(amount, [token, outputToken]).call();
        return web3.utils.toBN(amountsOut[1]);
    } else {
        const amountsOut = await router.methods.getAmountsOut(amount, [token, ADDRESS.WAVAX, outputToken]).call();
        return web3.utils.toBN(amountsOut[2]);
    }
}

async function estimateAPRs(pngReceived) {
    const stakingRewardsContract = new web3.eth.Contract(ABI.STAKING_REWARDS, ADDRESS.PNG_PNG_STAKING);

    const [rewardsDuration, periodFinish, currentRewardRate, currentStakedPNG] = await Promise.all([
        stakingRewardsContract.methods.rewardsDuration().call().then(web3.utils.toBN),
        stakingRewardsContract.methods.periodFinish().call().then(web3.utils.toBN),
        stakingRewardsContract.methods.rewardRate().call().then(web3.utils.toBN),
        stakingRewardsContract.methods.totalSupply().call().then(web3.utils.toBN),
    ])

    const ZERO = web3.utils.toBN(0);
    const SECONDS_IN_YEAR = 365 * 24 * 60 * 60;
    const now = web3.utils.toBN(Math.floor(Date.now() / 1000));
    const isExpired = now.gte(periodFinish);
    const currentRewards = isExpired ? ZERO : periodFinish.sub(now).mul(currentRewardRate);
    const newRewards = currentRewards.add(pngReceived.muln(85).divn(100));
    const newRewardRate = newRewards.div(rewardsDuration);

    const currentAPR = isExpired
        ? ZERO
        : currentRewardRate.muln(SECONDS_IN_YEAR).muln(100).div(currentStakedPNG);
    const newAPR = newRewardRate.muln(SECONDS_IN_YEAR).muln(100).div(currentStakedPNG);

    return [ currentAPR, newAPR ];
}