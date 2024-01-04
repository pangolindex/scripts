const CONFIG = require('../../config/config');
const ADDRESS = require('../../config/address.json');
const Safe = require('@gnosis.pm/safe-core-sdk').default;
const { EthSignSignature } = require('@gnosis.pm/safe-core-sdk');
const { OperationType } = require('@gnosis.pm/safe-core-sdk-types/dist/src/types');
const SafeServiceClient = require('@gnosis.pm/safe-service-client').default;
const Web3Adapter = require('@gnosis.pm/safe-web3-lib').default;

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));

const safeService = new SafeServiceClient('https://safe-transaction-avalanche.safe.global/');

const propose = async ({ multisigAddress, destination, value, bytecode }) => {
    web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
    const adapter = new Web3Adapter({
        web3,
        signerAddress: web3.eth.accounts.wallet[0].address,
    });

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
    web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
    const adapter = new Web3Adapter({
        web3,
        signerAddress: web3.eth.accounts.wallet[0].address,
    });

    const safeSdk = await Safe.create({
        ethAdapter: adapter,
        safeAddress: multisigAddress,
    });

    const safeSignature = await safeSdk.signTransactionHash(safeTxHash);

    console.log(`Confirming safe transaction hash ${safeTxHash} ...`);

    return await safeService.confirmTransaction(safeTxHash, safeSignature.data);
};

const revoke = async ({ multisigAddress, safeTxHash }) => {
    throw new Error(`Gnosis safe revoke is not yet supported via scripts`);
};

const execute = async ({ multisigAddress, safeTxHash }) => {
    web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
    const adapter = new Web3Adapter({
        web3,
        signerAddress: web3.eth.accounts.wallet[0].address,
    });

    const safeSdk = await Safe.create({
        ethAdapter: adapter,
        safeAddress: multisigAddress,
    });

    const safeMultisigTransactionResponse = await safeService.getTransaction(safeTxHash);

    if (safeMultisigTransactionResponse.isExecuted) {
        console.log(`Skipping ${safeTxHash} due to prior execution`);
        return;
    }

    const safeTransaction = await safeSdk.createTransaction(safeMultisigTransactionResponse);

    const pendingTransactions = await safeService.getPendingTransactions(multisigAddress);
    const pendingTransaction = pendingTransactions.results.find(x => x.safeTxHash === safeTxHash);

    if (!pendingTransaction) throw new Error('Missing transaction!');

    const confirmations = pendingTransaction.confirmations.sort((a,b) => a.owner > b.owner ? 1 : -1);

    for (const confirmation of confirmations) {
        const safeSignature = new EthSignSignature(confirmation.owner, confirmation.signature)
        safeTransaction.addSignature(safeSignature);
    }

    const baseGasPrice = await web3.eth.getGasPrice();

    console.log(`Executing safe transaction hash ${safeTxHash} ...`);

    const result = await safeSdk.executeTransaction(
        safeTransaction,
        {
            maxFeePerGas: baseGasPrice * 2,
            maxPriorityFeePerGas: web3.utils.toWei('1', 'nano'),
        }
    );
    return new Promise((resolve) => result.promiEvent.once('receipt', resolve));
};

const owners = async ({ multisigAddress }) => {
    const adapter = new Web3Adapter({
        web3,
        signerAddress: '0x0000000000000000000000000000000000000000', // web3.eth.accounts.wallet[0].address,
    });

    const safeSdk = await Safe.create({
        ethAdapter: adapter,
        safeAddress: multisigAddress,
    });

    const owners = await safeSdk.getOwners();
    return owners;
};

module.exports = {
    propose,
    confirm,
    revoke,
    execute,
    owners,
};
