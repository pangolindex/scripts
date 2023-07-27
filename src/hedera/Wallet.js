const MAINNETADDRESSES = require("./deployment.mainnet.json");
const {
  Client,
  AccountId,
  TokenAssociateTransaction,
  TokenId,
  TransactionId,
  Transaction,
  TransferTransaction,
  Hbar,
  ContractExecuteTransaction,
  ContractId,
  ContractFunctionParameters,
} = require("@hashgraph/sdk");

require("dotenv").config();

const mainnetAccount = process.env.HEDERA_MAINNET_ACCOUNT;
const mainnetPrivateKey = process.env.HEDERA_MAINNET_PRIVATEKEY;
const testnetAccount = process.env.HEDERA_TESTNET_ACCOUNT;
const testnetPrivateKey = process.env.HEDERA_TESTNET_PRIVATEKEY;

class Wallet {
  constructor() {}

  /** @type  {AccountId}*/
  accountId;
  /** @type {Client} */
  client;
  /** @type {'mainnet' | 'testnet'} */
  chain;

  /**
   * This function send a transaction to hedera
   * @param {Transaction} transaction
   * @returns {string | null}
   */
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

  /**
   * This function check if the string is valid account id, 0.0.0000...
   * @param {string | undefined} hederaId  Address to check
   * @returns {string | false}
   */
  isHederaIdValid(hederaId) {
    if (
      hederaId &&
      hederaId
        .toLowerCase()
        .match(
          /^(0|(?:[1-9]\d*))\.(0|(?:[1-9]\d*))\.(0|(?:[1-9]\d*))(?:-([a-z]{5}))?$/g
        )
    ) {
      return hederaId;
    } else {
      return false;
    }
  }

  /**
   * This function convert a string to TokenId instance
   * @param {string} tokenAddress Token address
   * @returns {TokenId}
   */
  toTokenId(tokenAddress) {
    return this.isHederaIdValid(tokenAddress)
      ? TokenId.fromString(tokenAddress)
      : TokenId.fromSolidityAddress(tokenAddress);
  }

  /**
   * This function convert a string to AccountId instance
   * @param {string} address
   * @returns {AccountId}
   */
  toAccountId(address) {
    return this.isHederaIdValid(address)
      ? AccountId.fromString(address)
      : AccountId.fromSolidityAddress(address);
  }

  /**
   * This function convert a string to ContractId instance
   * @param {string} address
   * @returns {ContractId}
   */
  toContractId(address) {
    return this.isHederaIdValid(address)
      ? ContractId.fromString(address)
      : ContractId.fromSolidityAddress(address);
  }

  /**
   * Function to associate with the  token
   * @param {string[]} tokenAddresses Token address
   */
  async tokenAssociate(tokenAddresses) {
    const tokenIds = tokenAddresses.map((tokenAddress) =>
      this.toTokenId(tokenAddress)
    );
    const transaction = new TokenAssociateTransaction();
    transaction.setAccountId(this.accountId);
    transaction.setTokenIds(tokenIds);

    const txId = await this.sendTransaction(transaction);
    if (txId) {
      console.log(`Success to Associate to token ${tokenId.toString()}.`);
    }
  }

  /**
   * This function send a HBAR amount to account
   * @param {string} recipient Address to send the HBAR
   * @param {number} amount Amount of HBAR to send
   */
  async transferHBAR(recipient, amount) {
    const recipientId = this.toAccountId(recipient);
    // Create a transaction to transfer HBAR to recipient
    const transaction = new TransferTransaction()
      .addHbarTransfer(this.accountId, new Hbar(amount * -1))
      .addHbarTransfer(recipientId, new Hbar(amount));

    const txId = await this.sendTransaction(transaction);
    if (txId) {
      console.log(
        `Success to Transfer ${amount.toString()} HBAR to ${recipientId.toString()}.`
      );
    }
  }

  /**
   * This function send a HBAR amount to multiple accounts
   * @param {string[]} recipients Array of address to send the HBAR
   * @param {number[]} amounts Array of amount of HBAR to send
   */
  async transferHBARToMupliple(recipients, amounts) {
    // Create a transaction to transfer HBAR to recipients
    const transaction = new TransferTransaction();
    let message = "Success to Transfer: \n";
    for (let index = 0; index < recipients.length; index++) {
      const recipientId = this.toAccountId(recipients[index]);
      const amount = amounts[index];
      transaction
        .addHbarTransfer(this.accountId, new Hbar(-amount))
        .addHbarTransfer(recipientId, new Hbar(amount));
      message += `${amount.toString()} HBAR to ${recipientId.toString()}; \n`;
    }

    const txId = await this.sendTransaction(transaction);
    if (txId) {
      console.log(message);
    }
  }

  /**
   * This function send a Token amount to account
   * @param {string} tokenAddress
   * @param {string} recipient
   * @param {number} amount
   */
  async transferToken(tokenAddress, recipient, amount) {
    const recipientId = this.toAccountId(recipient);
    const tokenId = this.toTokenId(tokenAddress);
    // Create a transaction to transfer Token to recipient
    const transaction = new TransferTransaction()
      .addTokenTransfer(tokenId, this.accountId, -amount)
      .addTokenTransfer(tokenId, recipientId, amount);

    const txId = await this.sendTransaction(transaction);
    if (txId) {
      console.log(
        `Success to Transfer ${amount.toString()} ${tokenId.toString()} to ${recipientId.toString()}.`
      );
    }
  }

  /**
   * This function send a Token amount to account
   * @param {string[]} tokenAddresses
   * @param {string[]} recipients
   * @param {number[]} amounts
   */
  async transferTokenToMultiple(tokenAddresses, recipients, amounts) {
    // Create a transaction to transfer Token to recipient
    const transaction = new TransferTransaction();
    let message = "Success to Transfer: \n";
    for (let index = 0; index < tokenAddresses.length; index++) {
      const amount = amounts[index];
      const recipientId = this.toAccountId(recipients[index]);
      const tokenId = this.toTokenId(tokenAddresses[index]);
      transaction
        .addTokenTransfer(tokenId, this.accountId, -amount)
        .addTokenTransfer(tokenId, recipientId, amount);
      message += `${amount.toString()} ${tokenId.toString()} to ${recipientId.toString()}; \n`;
    }

    const txId = await this.sendTransaction(transaction);
    if (txId) {
      console.log(message);
    }
  }

  /**
   *
   * @param {string} pangoChefAddress Address of pangochef
   * @param {string} tokenAddress Address of fungible token in EVM format
   * @param {string} pairContract Address of pair contract in EVM format
   */
  async addFarm(pangoChefAddress, tokenAddress, pairContract) {
    const pangoChefId = this.toContractId(pangoChefAddress);

    const transaction = new ContractExecuteTransaction()
      .setContractId(pangoChefId)
      .setFunction(
        "initializePool",
        new ContractFunctionParameters()
          .addAddress(tokenAddress) // token address
          .addAddress(pairContract) // pair contract address
          .addUint8(1) // poolType
      )
      .setGas(1_000_000);

    const txId = await this.sendTransaction(transaction);
    if (txId) {
      console.log("Success in add a new farm.");
    }
  }

  /**
   *
   * @param {string} pangoChefAddress Address of pangochef
   * @param {number[]} poolsIds Array of pool ids
   * @param {number[]} newWeights Array with new weights of each pool
   */
  async setWeights(pangoChefAddress, poolsIds, newWeights) {
    if (poolsIds.length !== newWeights.length) {
      throw new Error("The lengh of pool ids not is same of weights");
    }

    const pangoChefId = this.toContractId(pangoChefAddress);

    const transaction = new ContractExecuteTransaction()
      .setContractId(pangoChefId)
      .setFunction(
        "setWeights",
        new ContractFunctionParameters()
          .addUint256Array(poolsIds) // poolIds
          .addUint32Array(newWeights) // weights
      )
      .setGas(1_000_000);

    const txId = await this.sendTransaction(transaction);
    if (txId) {
      let message = "Success to changed the weight of:\n";
      for (let index = 0; index < poolsIds.length; index++) {
        const poolId = poolsIds[index];
        const weight = newWeights[index];
        message += `pid: ${poolId} - weight: ${weight}\n`;
      }
      console.log(message);
    }
  }
}

/**
 * Class representing a multisig hedera wallet with some useful functions
 * to interact with pangolin contracts
 */
class HederaMultisigWallet extends Wallet {
  /**@type {string} Address of multisig wallet in EVM format*/
  address;

  /**
   * @constructor
   * @param {string} multisigAddress Adddress of multisig
   * @param {'mainnet' | 'testnet' | undefined} chain
   */
  constructor(multisigAddress, chain = "mainnet") {
    super();
    this.address = multisigAddress;
    this.chain = chain;
    this.client =
      chain === "mainnet" ? Client.forMainnet() : Client.forTestnet();

    this.accountId = AccountId.fromSolidityAddress(this.address);

    const userAccount = chain === "mainnet" ? mainnetAccount : testnetAccount;
    const privateKey =
      chain === "mainnet" ? mainnetPrivateKey : testnetPrivateKey;

    if (!userAccount || !privateKey) {
      throw new Error(`Set ${chain} account or private key in our env file`);
    }

    const userAccountId = this.toAccountId(userAccount);
    this.client.setOperator(userAccountId, privateKey);
  }
}

/**
 * Class representing a single hedera wallet with some useful functions
 * to interact with pangolin contracts
 */
class HederaWallet extends Wallet {
  /**
   * @constructor
   * @param {'mainnet' | 'testnet' | undefined} chain
   */
  constructor(chain = "mainnet") {
    super();
    this.chain = chain;
    this.client =
      chain === "mainnet" ? Client.forMainnet() : Client.forTestnet();

    const account = chain === "mainnet" ? mainnetAccount : testnetAccount;
    const privateKey =
      chain === "mainnet" ? mainnetPrivateKey : testnetPrivateKey;

    if (!account || !privateKey) {
      throw new Error(`Set ${chain} account or private key in our env file`);
    }

    this.accountId = this.toAccountId(account);

    this.client.setOperator(this.accountId, privateKey);
  }
}

async function main() {
  const multisingWallet = new HederaMultisigWallet(
    "0x000000000000000000000000000000000040b1eb",
    "testnet"
  );

  const wallet = new HederaWallet("testnet");

  process.exit();
}

main();

module.exports = {
  HederaMultisigWallet,
  HederaWallet,
};
