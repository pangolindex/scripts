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

    for (let i = 0; i < sortedPositions.length; i++) {
        const acceptedPositions = sortedPositions.slice(0, i + 1);

        const totalValueUSD = acceptedPositions.reduce((sum, pos) => sum += pos.valueUSD, 0);
        const totalValueAVAX = acceptedPositions.reduce((sum, pos) => sum += pos.valueAVAX, 0);
        const harvestIncentiveValueUSD = totalValueUSD * (harvestIncentive / feeDenominator);
        const harvestIncentiveValueAVAX = totalValueAVAX * (harvestIncentive / feeDenominator);

        const tx = feeCollectorContract.methods.harvest(
            acceptedPositions.map(p => p.pgl),
            false, // claimMiniChef
            0, // calculate slippage later
        );
        const gas = await tx.estimateGas({ from: sender });
        const baseGasPrice = await web3.eth.getGasPrice();
        const expectedGasPrice = parseInt(baseGasPrice) + parseInt(web3.utils.toWei('2', 'nano'));
        const expectedGasAVAX = gas * expectedGasPrice / (10 ** 18);
        const expectedProfit = harvestIncentiveValueAVAX - expectedGasAVAX;

        if (expectedProfit >= bestProfit) {
            // Best scenario found
            console.log(`Considering harvesting ${acceptedPositions.length} liquidity positions worth $${totalValueUSD.toLocaleString(undefined, TWO_DECIMAL_LOCALE)}`);

            console.table(acceptedPositions.map(p => ({
                pgl: p.pgl,
                value: `$${p.valueUSD.toLocaleString(undefined, TWO_DECIMAL_LOCALE)}`,
            })));

            console.log(`Estimated incentive of $${harvestIncentiveValueUSD.toLocaleString(undefined, TWO_DECIMAL_LOCALE)} (${harvestIncentiveValueAVAX.toLocaleString(undefined, {maximumFractionDigits: 3})} AVAX)`);
            console.log(`Estimated gas cost of ~${expectedGasAVAX.toLocaleString(undefined, {minimumFractionDigits: 3})} AVAX`);
            console.log();

            bestPositions = acceptedPositions;
            bestProfit = expectedProfit;
        } else {
            // Previous scenario was best
            break;
        }
    }

    if (bestProfit > MIN_PROFIT_AVAX) {
        console.log(`Calculating PNG received and slippage ...`);
        console.log();

        const positionInfos = await Promise.all(bestPositions.map(getPositionInfo));

        let pngReceived = web3.utils.toBN(0);

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

        console.log(`Estimated PNG buyback of ${(pngReceived / (10 ** 18)).toLocaleString(undefined, {maximumFractionDigits: 3})}`);
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
    } else {
        console.log(`No profitable harvests detected`);
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
