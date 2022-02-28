// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');

const axios = require('axios');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
let startingAvax;
let endingAvax;


// Change These Variables
// --------------------------------------------------
const minimumHarvestBalanceUSD = 1000;
// --------------------------------------------------


(async () => {
    startingAvax = await web3.eth.getBalance(CONFIG.WALLET.ADDRESS);
    console.log(`Starting AVAX: ${startingAvax / (10 ** 18)}`);

    const feeCollectorContract = new web3.eth.Contract(ABI.FEE_COLLECTOR, ADDRESS.FEE_COLLECTOR);
    const harvestIncentive = parseInt(await feeCollectorContract.methods.harvestIncentive().call());
    const feeDenominator = parseInt(await feeCollectorContract.methods.FEE_DENOMINATOR().call());

    const { data: { data: { liquidityPositions } } } = await axios({
        url: 'https://api.thegraph.com/subgraphs/name/pangolindex/exchange',
        method: 'post',
        data: {
            query: `query {
                liquidityPositions(
                    first: 1000
                    where: { user: "${ADDRESS.FEE_COLLECTOR.toLowerCase()}" }
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

    const acceptedPositions = positions
        .filter(p => p.valueUSD >= minimumHarvestBalanceUSD)
        .sort((a,b) => a.valueUSD > b.valueUSD ? -1 : 1);

    const totalValueUSD = acceptedPositions.reduce((sum, pos) => sum += pos.valueUSD, 0);
    const totalValueAVAX = acceptedPositions.reduce((sum, pos) => sum += pos.valueAVAX, 0);
    const harvestIncentiveValueUSD = totalValueUSD * (harvestIncentive / feeDenominator);
    const harvestIncentiveValueAVAX = totalValueAVAX * (harvestIncentive / feeDenominator);

    const tx = feeCollectorContract.methods.harvest(
        acceptedPositions.map(p => p.pgl),
        false, // claimMiniChef
    );
    const gas = await tx.estimateGas({ from: CONFIG.WALLET.ADDRESS });
    const baseGasPrice = await web3.eth.getGasPrice();
    const expectedGasPrice = parseInt(baseGasPrice) + parseInt(web3.utils.toWei('2', 'nano'));
    const expectedGasAVAX = gas * expectedGasPrice / (10 ** 18);

    console.log(`Estimated incentive of $${harvestIncentiveValueUSD.toLocaleString(undefined, {maximumFractionDigits: 2})} (${harvestIncentiveValueAVAX.toLocaleString(undefined, {maximumFractionDigits: 3})} AVAX)`);
    console.log(`Estimated gas cost of ~${expectedGasAVAX.toLocaleString(undefined, {minimumFractionDigits: 3})} AVAX`);

    if (harvestIncentiveValueAVAX < expectedGasAVAX) {
        console.log(`Insufficient harvest incentive detected: aborting transaction submission`);
        return;
    }

    console.log('Sending harvest() ...');
    const receipt = await tx.send({
        from: CONFIG.WALLET.ADDRESS,
        gas,
        maxFeePerGas: baseGasPrice * 2,
        maxPriorityFeePerGas: web3.utils.toWei('2', 'nano'),
    });

    if (!receipt?.status) {
        console.log(receipt);
        process.exit(1);
    } else {
        console.log(`Transaction hash: ${snowtraceLink(receipt.transactionHash)}`);
    }
})()
  .catch(console.error)
  .finally(async () => {
      endingAvax = await web3.eth.getBalance(CONFIG.WALLET.ADDRESS);
      console.log(`Ending AVAX: ${endingAvax / (10 ** 18)}`);
      console.log(`AVAX spent: ${(startingAvax - endingAvax) / (10 ** 18)}`);
      process.exit(0);
  });

function snowtraceLink(hash) {
    return `https://snowtrace.io/tx/${hash}`;
}
