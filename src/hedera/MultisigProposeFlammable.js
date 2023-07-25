const {AccountId, TokenAssociateTransaction, TransactionId, Client} = require('@hashgraph/sdk');

const DEPLOYMENT = require('../config/deployment.mainnet.json');

// Replace these with your private/public key
const client = Client.forMainnet().setOperator(MAINNET.accountId, MAINNET.privateKey);


let tx;

(async () => {
    tx = await new TokenAssociateTransaction()
        .setTokenIds([
            AccountId.fromSolidityAddress(DEPLOYMENT['PNG (HTS)']).toString(),
        ])
        .setAccountId(AccountId.fromSolidityAddress(DEPLOYMENT['MultisigFlammable']).toString());

    const executedTx = await tx
        .setTransactionId(TransactionId.generate(AccountId.fromSolidityAddress(DEPLOYMENT['MultisigFlammable'])))
        .execute(client);

    const txId = executedTx.transactionId.toString();
    console.log(txId);

    await executedTx.getReceipt(client);
})()
    .catch(async (e) => {
        console.error(e);
        const record = await tx.getRecord(client);
        console.log(record.errorMessage);
    })
    .finally(process.exit);
