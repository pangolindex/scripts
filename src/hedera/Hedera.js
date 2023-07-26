const MAINNETADDRESSES = require("./deployment.mainnet.json");
const {
  Client,
  AccountId,
  TokenAssociateTransaction,
  TokenId,
  TransactionId,
} = require("@hashgraph/sdk");

const mainnetAccount = process.env.HEDERA_MAINNET_ACCOUNT;
const mainnetPrivateKey = process.env.HEDERA_MAINNET_PRIVATEKEY;
const testnetAccount = process.env.HEDERA_TESTNET_ACCOUNT;
const testnetPrivateKey = process.env.HEDERA_TESTNET_PRIVATEKEY;

export class HederaMultisig {
  address;
  accountId;
  client;
  chain;

  constructor(multisigAddress, chain = "mainnet") {
    this.address = multisigAddress;
    this.chain = chain;
    this.client =
      chain === "mainnet" ? Client.forMainnet() : Client.forTestnet();

    this.accountId = AccountId.fromSolidityAddress(this.address);

    const accountId = chain === "mainnet" ? mainnetAccount : testnetAccount;
    const privateKey =
      chain === "mainnet" ? mainnetPrivateKey : testnetPrivateKey;

    if (!accountId || !privateKey) {
      throw new Error(`Set ${chain} account or private key in our env file`);
    }

    this.client.setOperator(accountId, privateKey);
  }

  async sendTransaction(transaction) {
    try {
      const executedTx = await transaction
        .setTransactionId(TransactionId.generate(this.accountId))
        .execute(this.client);

      const txId = executedTx.transactionId.toString();
      console.log(
        `Transaction sent: https://hashscan.io/${this.chain}/transaction/${txId}`
      );
      return txId;
    } catch (error) {
      console.error("Error in sending transaction: ", error);
      return null;
    }
  }

  isHederaIdValid(hederaId) {
    if (
      hederaId &&
      hederaId
        ?.toLowerCase()
        ?.match(
          /^(0|(?:[1-9]\d*))\.(0|(?:[1-9]\d*))\.(0|(?:[1-9]\d*))(?:-([a-z]{5}))?$/g
        )
    ) {
      return hederaId;
    } else {
      return false;
    }
  }

  async tokenAssociate(tokenAddress) {
    const tokenId = this.isHederaIdValid(tokenAddress) ? TokenId.fromString(tokenAddress) : TokenId.fromSolidityAddress(tokenAddress);
    const transaction = new TokenAssociateTransaction(
      [tokenId],
      this.accountId
    );
    const txId = await this.sendTransaction(transaction);
    if (txId) {
      console.log(`Success to Associate to token ${tokenAddress}`);
    }
  }
}

