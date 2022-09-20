const ABI = require('../../config/abi.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));


// Change These Variables
// ---------------------------------------------------------------
const tokenAddresses = [
    '0x0000000000000000000000000000000000000000',
];
const owner = '0x0000000000000000000000000000000000000000';
const spender = '0x0000000000000000000000000000000000000000';
// ---------------------------------------------------------------


/*
 * Check the spending allowance (approval) of multiple tokens
 */
(async () => {
    const table = [];

    for (const tokenAddress of tokenAddresses) {
        const tokenContract = new web3.eth.Contract(ABI.TOKEN, tokenAddress);
        const allowance = await tokenContract.methods.allowance(owner, spender).call();
        console.log(`${tokenAddress}: ${allowance}`);
        table.push({
            token: tokenAddress,
            allowance,
        });
    }

    console.table(table);
})();
