// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');
const ADDRESS = require('../../config/address.json');
const CONSTANTS = require('../core/constants');
const { propose: gnosisMultisigPropose } = require('../core/gnosisMultisig');
const { propose: gnosisSafePropose } = require('../core/gnosisSafe');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
let startingAvax;
let endingAvax;

// Change These Variables
// --------------------------------------------------
const tokenAddresses = [
  '0x0000000000000000000000000000000000000000',
];
const spender = '0x0000000000000000000000000000000000000000';
const allowanceAmount = CONSTANTS.MAX_UINT256;
const multisigAddress = ADDRESS.PANGOLIN_GNOSIS_SAFE_ADDRESS;
const multisigType = CONSTANTS.GNOSIS_SAFE;
// --------------------------------------------------


(async () => {
    startingAvax = await web3.eth.getBalance(CONFIG.WALLET.ADDRESS);

    for (const tokenAddress of tokenAddresses) {
        const tokenContract = new web3.eth.Contract(ABI.TOKEN, tokenAddress);
        const [balance, allowance] = await Promise.all([
            tokenContract.methods.balanceOf(multisigAddress).call().then(web3.utils.toBN),
            tokenContract.methods.allowance(multisigAddress, spender).call().then(web3.utils.toBN),
        ]);
        if (balance.gt(allowance)) {
            const nonce = await web3.eth.getTransactionCount(CONFIG.WALLET.ADDRESS, 'pending');
            const tx = tokenContract.methods.approve(spender, allowanceAmount);
            const bytecode = tx.encodeABI();

            console.log(`Proposing approval for ${tokenAddress} ...`);

            switch (multisigType) {
                case CONSTANTS.GNOSIS_MULTISIG:
                    const receipt = await gnosisMultisigPropose({
                        multisigAddress,
                        destination: tokenAddress,
                        value: 0,
                        bytecode,
                        nonce,
                    });

                    if (!receipt?.status) {
                        console.log(receipt);
                        process.exit(1);
                    } else {
                        console.log(`Transaction hash: ${receipt.transactionHash}`);
                    }
                    break;
                case CONSTANTS.GNOSIS_SAFE:
                    await gnosisSafePropose({
                        multisigAddress,
                        destination: tokenAddress,
                        value: 0,
                        bytecode,
                        nonce,
                    });
                    break;
                default:
                    throw new Error(`Unknown multisig type: ${multisigType}`);
            }
        }
    }
})()
    .catch(console.error)
    .finally(async () => {
        endingAvax = await web3.eth.getBalance(CONFIG.WALLET.ADDRESS);
        console.log(`AVAX spent: ${(startingAvax - endingAvax) / (10 ** 18)}`);
        process.exit(0);
    });
