const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');
const CONFIG = require('../../config/config');
const Conversion = require('../core/conversion');
const Helpers = require('../core/helpers');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);

// Change These Variables
// ---------------------------------------------------------------
const pairAddress = '0x1784B2ff6841d46163fBf817b3FEb98A0E163E0f';
const value0USD = 0.075;
const value1USD = 1;
// ---------------------------------------------------------------



(async () => {
    const pairHelperContract = new web3.eth.Contract(ABI.PAIR_HELPER, ADDRESS.PAIR_HELPER);
    const pairContract = new web3.eth.Contract(ABI.PAIR, pairAddress);

    const [token0Address, token1Address] = await Promise.all([
        Helpers.getToken0Cached(pairAddress),
        Helpers.getToken1Cached(pairAddress),
    ]);
    const [token0Decimals, token1Decimals, token0Symbol, token1Symbol] = await Promise.all([
        Helpers.getDecimalsCached(token0Address),
        Helpers.getDecimalsCached(token1Address),
        Helpers.getSymbolCached(token0Address),
        Helpers.getSymbolCached(token1Address),
    ]);

    console.log(`Identified pair ${token0Symbol}-${token1Symbol}`);

    const desired0 = Conversion.convertFloatToBN(value1USD, token0Decimals);
    const desired1 = Conversion.convertFloatToBN(value0USD, token1Decimals);
    const desiredRatio = desired0.div(desired1);

    const { _reserve0, _reserve1 } = await pairContract.methods.getReserves().call();
    const actual0 = web3.utils.toBN(_reserve0);
    const actual1 = web3.utils.toBN(_reserve1);
    const actualRatio = actual0.div(actual1);

    console.log();
    console.log(`Desired for 1 ${token0Symbol} = ${value0USD/value1USD} ${token1Symbol}`);
    console.log(`Desired for 1 ${token1Symbol} = ${value1USD/value0USD} ${token0Symbol}`);
    console.log();
    console.log(`Currently 1 ${token0Symbol} = ${Conversion.convertStringToFloat(_reserve1, token1Decimals)/Conversion.convertStringToFloat(_reserve0, token0Decimals)} ${token1Symbol}`);
    console.log(`Currently 1 ${token1Symbol} = ${Conversion.convertStringToFloat(_reserve0, token0Decimals)/Conversion.convertStringToFloat(_reserve1, token1Decimals)} ${token0Symbol}`);
    console.log();

    const baseGasPrice = await web3.eth.getGasPrice();

    let tokenContract, required, existing, amount;

    if (desiredRatio.gt(actualRatio)) {
        // Add token0
        tokenContract = new web3.eth.Contract(ABI.TOKEN, token0Address);
        required = actual1.mul(desired0).div(desired1);
        existing = web3.utils.toBN(await tokenContract.methods.balanceOf(pairAddress).call());
        amount = required.sub(existing);
        console.log(`Needs ${Conversion.convertBNtoFloat(amount, token0Decimals)} (${amount}) ${token0Symbol}`);
    } else {
        // Add token1
        tokenContract = new web3.eth.Contract(ABI.TOKEN, token1Address);
        required = actual0.mul(desired1).div(desired0);
        existing = web3.utils.toBN(await tokenContract.methods.balanceOf(pairAddress).call());
        amount = required.sub(existing);
        console.log(`Needs ${Conversion.convertBNtoFloat(amount, token1Decimals)} (${amount}) ${token1Symbol}`);
    }

    if (amount.eqn(0)) return;

    console.log();
    console.log(`Will execute in 10 seconds ...`);
    await new Promise(resolve => setTimeout(resolve, 10_000));

    const allowance = await tokenContract.methods.allowance(CONFIG.WALLET.ADDRESS, pairHelperContract._address).call();

    if (parseInt(allowance) === 0) {
        // Do approval
        console.log();
        console.log('Approving ...');
        const allowanceTx = tokenContract.methods.approve(pairHelperContract._address, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
        await allowanceTx.send({
            from: CONFIG.WALLET.ADDRESS,
            value: 0,
            gas: await allowanceTx.estimateGas({ from: CONFIG.WALLET.ADDRESS }),
            maxFeePerGas: Math.floor(baseGasPrice * 1.5),
            maxPriorityFeePerGas: web3.utils.toWei('1', 'nano'),
        });
        console.log('Approved!');
    }

    const fixTx = pairHelperContract.methods.transferAndSync(pairAddress, tokenContract._address, amount);

    await fixTx.send({
        from: CONFIG.WALLET.ADDRESS,
        value: 0,
        gas: await fixTx.estimateGas({ from: CONFIG.WALLET.ADDRESS }),
        maxFeePerGas: Math.floor(baseGasPrice * 1.5),
        maxPriorityFeePerGas: web3.utils.toWei('1', 'nano'),
    })
        .then(receipt => {
            console.log(`Completed transferAndSync in tx ${receipt.transactionHash}`);
        });
})();
