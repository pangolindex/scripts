const CONFIG = require('../../config/config');
const ABI = require('../../config/abi.json');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));

const propose = async ({ multisigAddress, destination, value, bytecode, nonce }) => {
    web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);

    const multisigContract = new web3.eth.Contract(ABI.GNOSIS_MULTISIG, multisigAddress);

    const tx = multisigContract.methods.submitTransaction(destination, value, bytecode);

    const gas = await tx.estimateGas({ from: CONFIG.WALLET.ADDRESS });
    const baseGasPrice = await web3.eth.getGasPrice();

    const txConfig = {
        from: CONFIG.WALLET.ADDRESS,
        gas,
        maxFeePerGas: baseGasPrice * 2,
        maxPriorityFeePerGas: web3.utils.toWei('1', 'nano'),
    };

    // Conditionally specify nonce
    if (nonce !== undefined) txConfig.nonce = nonce;

    return tx.send(txConfig);
};

const confirm = async ({ multisigAddress, id, includeExtraGas, nonce }) => {
    web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);

    const multisigContract = new web3.eth.Contract(ABI.GNOSIS_MULTISIG, multisigAddress);

    const { executed } = await multisigContract.methods.transactions(id).call();
    if (executed) {
        console.log(`Skipping #${id} due to prior execution`);
        return;
    }

    const alreadyConfirmed = await multisigContract.methods.confirmations(id, CONFIG.WALLET.ADDRESS).call();
    if (alreadyConfirmed) {
        console.log(`Skipping #${id} due to prior confirmation`);
        return;
    }

    const tx = multisigContract.methods.confirmTransaction(id);

    const gas = await tx.estimateGas({ from: CONFIG.WALLET.ADDRESS });
    const baseGasPrice = await web3.eth.getGasPrice();

    const txConfig = {
        from: CONFIG.WALLET.ADDRESS,
        gas: includeExtraGas ? 7500000 : gas,
        maxFeePerGas: baseGasPrice * 2,
        maxPriorityFeePerGas: web3.utils.toWei('1', 'nano'),
    };

    // Conditionally specify nonce
    if (nonce !== undefined) txConfig.nonce = nonce;

    console.log(`Confirming transaction #${id} ...`);

    return tx.send(txConfig);
};

const revoke = async ({ multisigAddress, id, includeExtraGas, nonce }) => {
    web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);

    const multisigContract = new web3.eth.Contract(ABI.GNOSIS_MULTISIG, multisigAddress);

    const { executed } = await multisigContract.methods.transactions(id).call();
    if (executed) {
        console.log(`Skipping #${id} due to prior execution`);
        return;
    }

    const alreadyConfirmed = await multisigContract.methods.confirmations(id, CONFIG.WALLET.ADDRESS).call();
    if (!alreadyConfirmed) {
        console.log(`Skipping #${id} due to lack of confirmation`);
        return;
    }

    const tx = multisigContract.methods.revokeConfirmation(id);

    const gas = await tx.estimateGas({ from: CONFIG.WALLET.ADDRESS });
    const baseGasPrice = await web3.eth.getGasPrice();

    const txConfig = {
        from: CONFIG.WALLET.ADDRESS,
        gas: includeExtraGas ? 7500000 : gas,
        maxFeePerGas: baseGasPrice * 2,
        maxPriorityFeePerGas: web3.utils.toWei('1', 'nano'),
    };

    // Conditionally specify nonce
    if (nonce !== undefined) txConfig.nonce = nonce;

    console.log(`Revoking transaction #${id} ...`);

    return tx.send(txConfig);
};

const verify = async ({ multisigAddress, id }) => {
    const multisigContract = new web3.eth.Contract(ABI.GNOSIS_MULTISIG, multisigAddress);

    const { destination, value, data, executed } = await multisigContract.methods.transactions(id).call();
    const confirmations = await multisigContract.methods.getConfirmations(id).call();
    const required = await multisigContract.methods.required().call();

    const executionTx = multisigContract.methods.executeTransaction(id);
    let gasEstimate;
    try {
        gasEstimate = await executionTx.estimateGas({ from: CONFIG.WALLET.ADDRESS, value });
    } catch(e) {}

    return { destination, value, data, executed, confirmations, required, gasEstimate };
};

const execute = async ({ multisigAddress, id, nonce }) => {
    web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);

    const multisigContract = new web3.eth.Contract(ABI.GNOSIS_MULTISIG, multisigAddress);

    const { executed } = await multisigContract.methods.transactions(id).call();
    if (executed) {
        console.log(`Skipping #${id} due to prior execution`);
        return;
    }

    const tx = multisigContract.methods.executeTransaction(id);

    const baseGasPrice = await web3.eth.getGasPrice();

    const txConfig = {
        from: CONFIG.WALLET.ADDRESS,
        gas: 7500000,
        maxFeePerGas: baseGasPrice * 2,
        maxPriorityFeePerGas: web3.utils.toWei('1', 'nano'),
    };

    // Conditionally specify nonce
    if (nonce !== undefined) txConfig.nonce = nonce;

    console.log(`Executing transaction #${id} ...`);

    return tx.send(txConfig);
};

const owners = async ({ multisigAddress }) => {
    const multisigContract = new web3.eth.Contract(ABI.GNOSIS_MULTISIG, multisigAddress);
    const owners = await multisigContract.methods.getOwners().call();
    return owners;
};

module.exports = {
    propose,
    confirm,
    revoke,
    verify,
    execute,
    owners,
};
