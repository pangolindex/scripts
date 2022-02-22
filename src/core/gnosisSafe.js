const CONFIG = require('../../config/config');
const ADDRESS = require('../../config/address.json');
const Safe = require('@gnosis.pm/safe-core-sdk').default;
const { EthSignSignature } = require('@gnosis.pm/safe-core-sdk');
const { OperationType } = require('@gnosis.pm/safe-core-sdk-types/dist/src/types');
const SafeServiceClient = require('@gnosis.pm/safe-service-client').default;
const Web3Adapter = require('@gnosis.pm/safe-web3-lib').default;

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);

const safeService = new SafeServiceClient('https://safe-transaction.avalanche.gnosis.io');
const adapter = new Web3Adapter({
    web3,
    signerAddress: web3.eth.accounts.wallet[0].address,
});

const propose = async ({ multisigAddress, destination, value, bytecode }) => {
    const safeSdk = await Safe.create({
        ethAdapter: adapter,
        safeAddress: multisigAddress,
    });

    const baseTxn = {
        to: destination,
        value: value.toString(),
        data: bytecode,
        operation: OperationType.Call,
    };

    const { safeTxGas } = await safeService.estimateSafeTransaction(multisigAddress, baseTxn);

    const safeTxData = {
        ...baseTxn,
        safeTxGas: parseInt(safeTxGas),
        nonce: await safeService.getNextNonce(multisigAddress),
        baseGas: 0,
        gasPrice: 0,
        gasToken: ADDRESS.ZERO_ADDRESS,
        refundReceiver: ADDRESS.ZERO_ADDRESS,
    };

    const safeTransaction = await safeSdk.createTransaction(safeTxData);
    await safeSdk.signTransaction(safeTransaction);

    return await safeService.proposeTransaction({
        safeAddress: multisigAddress,
        senderAddress: web3.eth.accounts.wallet[0].address,
        safeTransaction,
        safeTxHash: await safeSdk.getTransactionHash(safeTransaction),
    });
};

const confirm = async ({ multisigAddress, safeTxHash }) => {
    const safeSdk = await Safe.create({
        ethAdapter: adapter,
        safeAddress: multisigAddress,
    });

    const safeSignature = await safeSdk.signTransactionHash(safeTxHash);

    console.log(`Confirming safe transaction hash ${safeTxHash} ...`);

    return await safeService.confirmTransaction(safeTxHash, safeSignature.data);
};

/*
 * TODO: Currently not functioning and is a WiP...
 */
const execute = async ({ multisigAddress, safeTxHash }) => {

    throw new Error(`Gnosis safe execution is not yet supported!`);

    const safeSdk = await Safe.create({
        ethAdapter: adapter,
        safeAddress: multisigAddress,
    });

    const safeMultisigTransactionResponse = await safeService.getTransaction(safeTxHash);
    const safeTransaction = await safeSdk.createTransaction(safeMultisigTransactionResponse);

    const currentSafeNonce = 0;
    const pendingTransactions = await safeService.getPendingTransactions(multisigAddress, currentSafeNonce);
    const pendingTransaction = pendingTransactions.results.find(x => x.safeTxHash === safeTxHash);

    if (!pendingTransaction) throw new Error('Missing transaction!');

    for (const confirmation of pendingTransaction.confirmations) {
        const signature = new EthSignSignature(confirmation.owner, confirmation.signature)
        safeTransaction.addSignature(signature);
    }

    console.log(`Executing safe transaction hash ${safeTxHash} ...`);

    return await safeSdk.executeTransaction(safeTransaction); // return.hash
};

module.exports = {
    propose,
    confirm,
    execute,
};
