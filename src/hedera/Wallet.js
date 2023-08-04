const {
  Client,
  AccountId,
  TokenAssociateTransaction,
  TransactionId,
  Transaction,
  TransferTransaction,
  Hbar,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  PrivateKey,
} = require("@hashgraph/sdk");
const { toContractId, toAccountId, toTokenId } = require("./utils");
const {
  ChainId,
  CurrencyAmount,
  CAVAX,
  TokenAmount,
  Token,
  JSBI,
} = require("@pangolindex/sdk");
const { HederaFetcher } = require("./fetcher");
const Helpers = require("../core/helpers");
const chalk = require("chalk");

require("dotenv").config();

const account = process.env.WALLET_ADDRESS;
const privateKey = process.env.WALLET_KEY;

const InvaliEnvError = new Error(`Set account or private key in our env file`);

class Wallet {
  /** @type  {AccountId}*/
  accountId;
  /** @type {Client} */
  client;
  /** @type {ChainId} */
  chainId;
  /** @type {"mainnet" | "testnet"} */
  chain;
  fetcher;
  /** @type {CurrencyAmount} - Amount of Hbar in account*/
  hbarBalance;
  /** @type {TokenAmount[]}  */
  tokensBalance;
  /** @type {string} - Last transaction*/
  transaction;

  /**
   *
   * @param {ChainId} chainId
   * @throws {InvaliEnvError} Will throw an error if not have account or pivate key in env file
   */
  constructor(chainId) {
    this.chainId = chainId;
    this.chain = chainId === ChainId.HEDERA_MAINNET ? "mainnet" : "testnet";
    this.client =
      chainId === ChainId.HEDERA_MAINNET
        ? Client.forMainnet()
        : Client.forTestnet();

    if (!account || !privateKey) {
      throw InvaliEnvError;
    }

    this.fetcher = new HederaFetcher(chainId);
    this.hbarBalance = CurrencyAmount.fromRawAmount(CAVAX[chainId], 0);
    this.tokensBalance = [];
    this.transaction = "";
  }

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
        chalk.green(
          `Transaction sent: https://hashscan.io/${this.chain}/transaction/${txId}`
        )
      );
      return txId;
    } catch (error) {
      console.error(chalk.red("Error in sending transaction: ", error));
      return null;
    }
  }

  /**
   * Function to associate with the  token
   * @param {Token[]} tokens Tokens instance
   */
  async tokenAssociate(tokens) {
    const tokenIds = tokens.map((token) => toTokenId(token.address));
    const transaction = new TokenAssociateTransaction();
    transaction.setAccountId(this.accountId);
    transaction.setTokenIds(tokenIds);

    const txId = await this.sendTransaction(transaction);
    if (txId) {
      console.log(
        chalk.green(
          `Success to Associate to: ${tokens
            .map((token) => token.symbol)
            .join(", ")}.`
        )
      );
    }
  }

  /**
   * This function send multiple tokens/HBAR amounts to multiple accounts
   * @param {(TokenAmount | CurrencyAmount)[]} tokensAmount
   * @param {string[]} recipients
   * @throws Throw an error when the arrays lengths not is same.
   */
  async transferTokens(tokensAmount, recipients) {
    if (tokensAmount.length !== recipients.length) {
      throw new Error("The lengh of tokensAmount not is same of recipients");
    }

    // Create a transaction to transfer Token to recipient
    const transaction = new TransferTransaction();
    for (let index = 0; index < tokensAmount.length; index++) {
      const tokenAmount = tokensAmount[index];
      const recipientId = toAccountId(recipients[index]);
      if (tokenAmount instanceof TokenAmount) {
        const tokenId = toTokenId(tokenAmount.token);
        transaction
          .addTokenTransfer(
            tokenId,
            this.accountId,
            JSBI.toNumber(tokenAmount.raw) * -1
          )
          .addTokenTransfer(
            tokenId,
            recipientId,
            JSBI.toNumber(tokenAmount.raw)
          );
      } else {
        transaction
          .addHbarTransfer(this.accountId, JSBI.toNumber(tokenAmount.raw) * -1)
          .addHbarTransfer(recipientId, JSBI.toNumber(tokenAmount.raw));
      }
    }

    const txId = await this.sendTransaction(transaction);

    if (txId) {
      let message = "Success to Transfer: \n";
      for (let index = 0; index < tokensAmount.length; index++) {
        const recipientId = toAccountId(recipients[index]);
        const tokenAmount = tokensAmount[index];
        const symbol =
          tokenAmount instanceof TokenAmount
            ? tokenAmount.token.symbol
            : tokenAmount.currency.symbol;
        message += `${tokenAmount.toExact()} ${symbol} to ${recipientId.toString()}; \n`;
      }
      console.log(chalk.green(message));
      return txId;
    }

    return null;
  }

  /**
   *
   * @param {string} pangoChefAddress Address of pangochef
   * @param {string} tokenAddress Address of fungible token in EVM format
   * @param {string} pairContract Address of pair contract in EVM format
   */
  async addFarm(pangoChefAddress, tokenAddress, pairContract) {
    const pangoChefId = toContractId(pangoChefAddress);

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
      console.log(chalk.green("Success in add a new farm."));
    }
  }

  /**
   *
   * @param {string} pangoChefAddress Address of pangochef
   * @param {number[]} poolsIds Array of pool ids
   * @param {number[]} newWeights Array with new weights of each pool
   * @throws Throw an error when the arrays lengths not is same.
   */
  async setWeights(pangoChefAddress, poolsIds, newWeights) {
    if (poolsIds.length !== newWeights.length) {
      throw new Error("The lengh of pool ids not is same of weights");
    }

    const pangoChefId = toContractId(pangoChefAddress);

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
      console.log(chalk.green(message));
    }
  }

  /**
   * This function wrap HBAR in WHBAR
   * @param {string} whbarAddress Address of whbar contract
   * @param {CurrencyAmount} amount Amount of HBAR to wrap
   */
  async wrap(whbarAddress, amount) {
    const whbarContractId = toContractId(whbarAddress);
    const transaction = new ContractExecuteTransaction()
      .setContractId(whbarContractId)
      .setFunction("deposit")
      .setPayableAmount(amount.raw.toString())
      .setGas(100_000);

    const txId = await this.sendTransaction(transaction);
    if (txId) {
      console.log(chalk.green(`Success to wrap ${amount.toExact()} HBAR.`));
      return txId;
    }
    return null;
  }

  /**
   * This function unwrap WHBAR in HBAR
   * @param {string} whbarAddress Address of whbar contract
   * @param {number} amount Amount of WHBAR to unwrap
   */
  async unwrap(whbarAddress, amount) {
    const whbarContractId = toContractId(whbarAddress);
    const transaction = new ContractExecuteTransaction()
      .setContractId(whbarContractId)
      .setFunction(
        "withdraw",
        new ContractFunctionParameters().addUint256(amount)
      )
      .setGas(1000_000);

    const txId = await this.sendTransaction(transaction);
    if (txId) {
      console.log(chalk.green(`Success to unwrap ${amount} WHBAR.`));
      return txId;
    }
    return null;
  }

  /**
   * This function add new rewarder
   * @param {string} pangoChefAddress
   * @param {number} poolId
   * @param {string} rewarder
   */
  async addRewarder(pangoChefAddress, poolId, rewarder) {
    const pangochefId = toContractId(pangoChefAddress);
    const transaction = new ContractExecuteTransaction()
      .setContractId(pangochefId)
      .setFunction(
        "setRewarder",
        new ContractFunctionParameters().addUint256(poolId).addAddress(rewarder)
      )
      .setGas(250_000);

    const txId = await this.sendTransaction(transaction);
    if (txId) {
      console.log(chalk.green(`Success to add new rewarder to farm ${poolId}`));
    }
  }

  /**
   * This function wrap hbar to whbar and fund the rewarders with whbar
   * @param {string} whbarAddress Address of whbar contract
   * @param {string[]} rewarderAddresses Address of rewarders
   * @param {number[]} amounts Amount to fund each rewarder
   */
  async fundRewardersWithWHBAR(whbarAddress, rewarderAddresses, amounts) {
    if (rewarderAddresses.length !== amounts.length) {
      throw new Error("The lengh of rewarders not is same of amounts");
    }

    const totalWHBAR = amounts.reduce((total, amount) => total + amount, 0);

    const wrapTxId = await this.wrap(whbarAddress, totalWHBAR);

    if (wrapTxId) {
      /** @type {string[]}*/
      const whbarAddressArray = new Array(rewarderAddresses.length).fill(
        whbarAddress
      );

      const txId = this.transferTokenToMultiple(
        whbarAddressArray,
        rewarderAddresses,
        amounts
      );
      if (txId) {
        console.log(chalk.green("Success to fund the rewerders"));
        return;
      }
    }

    console.log(chalk.red("Error in fund rewarders with HBAR."));
  }

  /**
   * This function fund the rewarders with multiple tokens
   * @param {string[]} rewarderAddresses Array of rewarders addresses
   * @param {string[][]} tokensAddresses Array of Array with address of token
   * @param {number[][]} amounts Array of Array with amount of token to fund each rewarder
   */
  async fundRewardersWithTokens(rewarderAddresses, tokensAddresses, amounts) {
    if (
      tokensAddresses.length !== amounts.length ||
      rewarderAddresses.length !== tokensAddresses.length ||
      rewarderAddresses.length !== amounts.length
    ) {
      throw new Error("The lengh of arrays not is same");
    }

    for (let index = 0; index < rewarderAddresses.length; index++) {
      const tokens = tokensAddresses[index];
      const tokensAmounts = amounts[index];
      const rewarder = rewarderAddresses[index];

      if (tokens.length !== tokensAmounts.length) {
        throw new Error("The lengh of tokens not is same of amounts");
      }

      /** @type {string[]}*/
      const rewarderArray = new Array(tokens.length).fill(rewarder);

      const txId = this.transferTokenToMultiple(
        tokens,
        rewarderArray,
        tokensAmounts
      );

      if (txId) {
        console.log(chalk.green(`Success to fund the rewarder ${rewarder}`));
        return;
      }

      console.log(chalk.red("Error in fund rewarders with HBAR."));
    }
  }

  /**
   * This function create a new propose to pangolin governance
   * @param {string} governorAddress Address of governance contract
   * @param {string[]} targets Array of target addresses
   * @param {number[]} values Array of values target addresses
   * @param {string[]} signatures Array of function signatures
   * @param {Uint8Array[]} datas Array of args of functions
   * @param {string} description Description of proposal
   * @param {number} nftId Id of nft to use to create a new proposal
   */
  async submitProposal(
    governorAddress,
    targets,
    values,
    signatures,
    datas,
    description,
    nftId
  ) {
    const governorId = toContractId(governorAddress);

    const transaction = new ContractExecuteTransaction()
      .setContractId(governorId)
      .setFunction(
        "propose",
        new ContractFunctionParameters()
          .addAddressArray(targets) // targets
          .addUint256Array(values) // values
          .addStringArray(signatures) // signatures
          .addBytesArray(datas) // datas
          .addString(description) // description
          .addInt64(nftId) // nftId
      );

    const txId = await this.sendTransaction(transaction);
    if (txId) {
      console.log(chalk.green("Success to create a new propose"));
    }
  }

  /**
   * This function execute a proposal
   * @param {string} governorAddress Address of governance contract
   * @param {number} proposalId Id of proposal
   */
  async executeProposal(governorAddress, proposalId) {
    const governorId = toContractId(governorAddress);

    const transaction = new ContractExecuteTransaction()
      .setContractId(governorId)
      .setFunction(
        "execute",
        new ContractFunctionParameters().addUint64(proposalId)
      );

    const txId = transaction.sendTransaction(transaction);
    if (txId) {
      console.log(chalk.green("Success to execute the proposal"));
    }
  }

  /**
   * This function queue a proposal to timelock
   * @param {string} governorAddress Address of governance contract
   * @param {number} proposalId Id of proposal
   */
  async queueProposal(governorAddress, proposalId) {
    const governorId = toContractId(governorAddress);

    const transaction = new ContractExecuteTransaction()
      .setContractId(governorId)
      .setFunction(
        "queue",
        new ContractFunctionParameters().addUint64(proposalId)
      );

    const txId = transaction.sendTransaction(transaction);
    if (txId) {
      console.log(chalk.green("Success to queue the proposal"));
    }
  }

  /**
   * This function cancel a proposal
   * @param {string} governorAddress Address of governance contract
   * @param {number} proposalId Id of proposal
   */
  async cancelProposal(governorAddress, proposalId) {
    const governorId = toContractId(governorAddress);

    const transaction = new ContractExecuteTransaction()
      .setContractId(governorId)
      .setFunction(
        "cancel",
        new ContractFunctionParameters().addUint64(proposalId)
      );

    const txId = transaction.sendTransaction(transaction);
    if (txId) {
      console.log(chalk.green("Success to cancel the proposal"));
    }
  }

  /**
   * This function vote a prosal
   * @param {string} governorAddress Address of governance contract
   * @param {number} proposalId Id of proposal
   * @param {boolean} support If support the proposal, true for yes, false for no
   * @param {number} nftId Id of nft to use to vote
   */
  async castVote(governorAddress, proposalId, support, nftId) {
    const governorId = toContractId(governorAddress);

    const transaction = new ContractExecuteTransaction()
      .setContractId(governorId)
      .setFunction(
        "castVote",
        new ContractFunctionParameters()
          .addUint64(proposalId)
          .addBool(support)
          .addAddress(nftId)
      );

    const txId = transaction.sendTransaction(transaction);
    if (txId) {
      console.log(chalk.green("Success to vote in the proposal"));
    }
  }

  async getWalletInfo() {
    console.log("Fetching wallet info...");

    const [walletInfo, tokensAssociated] = await Promise.all([
      this.fetcher.getWalletInfo(this.accountId.toString()),
      this.fetcher.getWalletTokens(this.accountId.toString()),
    ]);

    this.hbarBalance = CurrencyAmount.fromRawAmount(
      CAVAX[this.chainId],
      walletInfo?.hbarBalance ?? 0
    );

    this.transaction = walletInfo?.transaction ?? "";

    //remove nfts from array
    const tokens = walletInfo?.tokens?.filter((token) =>
      tokensAssociated.includes(token.token_id)
    );
    const tokensToFetch = tokens.map((tokenInfo) =>
      Helpers.toChecksumAddress(
        `0x${toTokenId(tokenInfo.token_id).toSolidityAddress()}`
      )
    );

    const tokensMap = await Helpers.getTokensCached(
      tokensToFetch,
      this.chainId
    );

    this.tokensBalance = tokens.map((tokenInfo, index) => {
      const address = tokensToFetch[index];
      const token = tokensMap[address];
      return new TokenAmount(token, tokenInfo.balance);
    });

    console.log(`Completed the fetch of wallet info.`);
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
   * @param {ChainId} chainId
   */
  constructor(multisigAddress, chainId = ChainId.HEDERA_MAINNET) {
    super(chainId);
    this.address = multisigAddress;

    this.accountId = AccountId.fromSolidityAddress(this.address);

    const userAccountId = toAccountId(account);
    this.client.setOperator(this.userAccountId, privateKey);

    console.log(
      chalk.green("Connected to admin account:", userAccountId.toString())
    );
    console.log(
      chalk.green("Connected to multisig:", this.accountId.toString())
    );
  }
}

/**
 * Class representing a single hedera wallet with some useful functions
 * to interact with pangolin contracts
 */
class HederaWallet extends Wallet {
  /**
   * @constructor
   * @param {ChainId} chain
   */
  constructor(chainId = ChainId.HEDERA_MAINNET) {
    super(chainId);

    this.accountId = toAccountId(account);

    this.client.setOperator(this.accountId, privateKey);

    console.log(chalk.green("Connected to wallet:", this.accountId.toString()));
  }
}

module.exports = {
  HederaMultisigWallet,
  HederaWallet,
};
