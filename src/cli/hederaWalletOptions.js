const {
  ChainId,
  TokenAmount,
  CurrencyAmount,
  Token,
  CHAINS,
} = require("@pangolindex/sdk");
const { HederaMultisigWallet, HederaWallet } = require("../hedera/Wallet");
const { getFarms, showFarmsFriendly } = require("../pangochef/utils");
const { isValidAddress, toTokenId } = require("../hedera/utils");
const inquirer = require("inquirer");
const Helpers = require("../core/helpers");
const chalk = require("chalk");

/**
 * Validade if a input is an herdera address or evm
 * @param {string} input
 * @returns {string | true}
 */
function validadeAddress(input) {
  return isValidAddress(input) || "Not is valid address.";
}

/**
 * This function convert an input to CurrencyAmount
 * @param {number} input
 * @param {CurrencyAmount | TokenAmount} tokenAmount
 * @returns {CurrencyAmount | TokenAmount}
 */
function convertToAmount(input, tokenAmount) {
  const token =
    tokenAmount instanceof TokenAmount
      ? tokenAmount.token
      : tokenAmount.currency;
  const rawAmount = Helpers.parseUnits(input, token.decimals);

  return token instanceof Token
    ? new TokenAmount(token, rawAmount)
    : CurrencyAmount.fromRawAmount(token, rawAmount);
}

/**
 * @param {HederaMultisigWallet | HederaWallet} wallet
 */
function generateQuestions(wallet) {
  const chain = CHAINS[wallet.chainId];

  const choices = [
    {
      name: "Show wallet info, HBAR balance, last transaction, tokens balances.",
      value: "walletInfo",
      short: "Show wallet info.",
    },
    {
      name: "List farms.",
      value: "listFarms",
    },
    {
      name: "Associate to multiple tokens.",
      value: "asssociateToken",
    },
  ];

  if (wallet instanceof HederaMultisigWallet) {
    choices.push({
      name: "List Thresholds and Admin accounts",
      value: "listMultisigInfo",
    });
  }

  if (wallet.hbarBalance.greaterThan("0")) {
    choices.push({
      name: "Wrap HBAR into WHBAR.",
      value: "wrap",
    });
  }

  if (
    wallet.tokensBalance.some(
      (tokenBalance) =>
        tokenBalance.greaterThan("0") &&
        tokenBalance.token.address.toLowerCase() ===
          chain.contracts?.wrapped_native_token?.toLowerCase()
    )
  ) {
    choices.push({
      name: "Uwrap WHBAR into HBAR.",
      value: "unwrap",
    });
  }

  if (
    wallet.hbarBalance.greaterThan("0") ||
    wallet.tokensBalance.some((balance) => balance.greaterThan("0"))
  ) {
    choices.push({
      name: "Transfer tokens. (HBAR or anothers tokens in account)",
      value: "transferToken",
    });
  }

  choices.push(
    {
      name: "Add new farm.",
      value: "addFarm",
    },
    {
      name: "Add new rewarder contract to a farm.",
      value: "addRewarder",
      short: "Add new rewarder.",
    },
    {
      name: "Fund rewarders contract with hbar, this function wrap hbar to whbar and fund the contract.",
      value: "fundRewardersHBAR",
      short: "Fund rewarders contract with hbar.",
    },
    {
      name: "Fund rewarders contract with tokens.",
      value: "fundRewardersTokens",
    },
    {
      name: "Set weights of farms.",
      value: "setWeights",
    },
    {
      name: "Submit a proposal.",
      value: "submitProposal",
    },
    {
      name: "Execute a proposal.",
      value: "executeProposal",
    },
    {
      name: "Caste vote.",
      value: "castVote",
    },
    {
      name: "Queue proposal.",
      value: "queueProposal",
    },
    {
      name: "Exit",
      value: "exit",
    }
  );

  return {
    type: "list",
    name: "category",
    message: "Select a option:",
    choices: choices,
  };
}

/**
 * This function associate to multiple tokens
 * @param {HederaMultisigWallet | HederaWallet} wallet
 */
async function associateTokens(wallet) {
  const tokensAddresses = [];
  while (true) {
    const answers = await inquirer.prompt([
      {
        message: "Enter with token address:",
        name: "tokenAddress",
        type: "input",
        validate: validadeAddress,
        filter: (input) => {
          return Helpers.toChecksumAddress(
            `0x${toTokenId(input).toSolidityAddress()}`
          );
        },
      },
      {
        message: "Associate a new token?",
        name: "continue",
        type: "confirm",
      },
    ]);

    tokensAddresses.push(answers.tokenAddress);

    if (!answers.continue) {
      break;
    }
  }

  const tokensMap = await Helpers.getTokensCached(
    tokensAddresses,
    wallet.chainId
  );
  const tokens = tokensAddresses.map((address) => tokensMap[address]);

  await wallet.tokenAssociate(tokens);
}

/**
 * This function transfers tokens or HBAR to multiple recipients
 * @param {HederaMultisigWallet | HederaWallet} wallet
 */
async function transferTokens(wallet) {
  const tokensAmount = [];
  const recipients = [];

  /** @type {(CurrencyAmount | TokenAmount)[]} */
  const tokensChoices = [wallet.hbarBalance].concat(
    wallet.tokensBalance.filter((tokenBalance) => tokenBalance.greaterThan("0"))
  );

  while (true) {
    const answers = await inquirer.prompt([
      {
        message: "Select a token",
        type: "list",
        name: "token",
        choices: tokensChoices.map((tokenAmount) => {
          const name =
            tokenAmount instanceof TokenAmount
              ? `${tokenAmount.token.symbol} - ${tokenAmount.token.address}`
              : tokenAmount.currency.symbol;
          return {
            name: name,
            value: tokenAmount,
          };
        }),
      },
      {
        message: (prevAnswers) => {
          const tokenAmount = prevAnswers.token;
          const symbol =
            tokenAmount instanceof TokenAmount
              ? `${tokenAmount.token.symbol}`
              : tokenAmount.currency.symbol;

          return `${symbol} balance: ${tokenAmount.toExact()}, Enter with amount to transfer:`;
        },
        name: "amount",
        type: "number",
        validate: (input, prevAnswers) => {
          if (input instanceof CurrencyAmount) {
            return true;
          }
          const rawAmount = convertToAmount(input, prevAnswers.token);
          // HBAR is gas token, so we can't send all hbar in transfer
          const bool =
            rawAmount instanceof TokenAmount
              ? !prevAnswers.token.lessThan(rawAmount)
              : prevAnswers.token.greaterThan(rawAmount);
          return (input > 0 && bool) || "Invalid input.";
        },
        transformer: (input) => {
          return isNaN(input) || input <= 0 ? "" : input;
        },
      },
      {
        message: "Enter with recipient address:",
        name: "recipient",
        type: "input",
        validate: validadeAddress,
      },
      {
        message: (prevAnswers) => {
          const recipient = prevAnswers.recipient;
          const name =
            prevAnswers.token instanceof TokenAmount
              ? `${prevAnswers.token.token.symbol} - ${prevAnswers.token.token.address}`
              : prevAnswers.token.currency.symbol;
          return `Confirm to transfer ${prevAnswers.amount} ${name} to ${recipient}?`;
        },
        name: "confirmTransfer",
        type: "confirm",
      },
      {
        message: "Transfer more tokens?",
        name: "continue",
        type: "confirm",
      },
    ]);

    if (answers.confirmTransfer) {
      tokensAmount.push(convertToAmount(answers.amount, answers.token));
      recipients.push(answers.recipient);
    }

    if (!answers.continue) {
      break;
    }
  }

  await wallet.transferTokens(tokensAmount, recipients);
}

/**
 *
 * @param {HederaMultisigWallet | HederaWallet} wallet
 */
async function wrapHBAR(wallet) {
  const chain = CHAINS[wallet.chainId];

  const answer = await inquirer.prompt({
    message: "Enter with amount to wrap:",
    name: "amount",
    type: "number",
    validade: (input) => {
      const rawAmount = convertToAmount(input, wallet.hbarBalance);
      // HBAR is gas token, so we can't send all hbar in transfer
      return (
        (input > 0 && wallet.hbarBalance.greaterThan(rawAmount)) ||
        "Invalid input."
      );
    },
    transformer: (input) => {
      return isNaN(input) || input <= 0 ? "" : input;
    },
  });

  const whbarAddress = chain.contracts?.wrapped_native_token;
  if (!whbarAddress) {
    console.log(chalk.red("Error, this don't have wrapped contract!"));
    return false;
  }

  const amount = convertToAmount(answer.amount, wallet.hbarBalance);
  const txId = await wallet.wrap(whbarAddress, amount);
  return !!txId;
}

/**
 *
 * @param {ChainId} chainId
 * @param {HederaMultisigWallet | HederaWallet} wallet
 */
async function walletOptions(wallet) {
  console.log("Initializing wallet, please wait.");

  const fetchFarm = async () => {
    console.log("Fetching farms...");
    const farms = await getFarms(wallet.chainId);
    console.log(`Found ${farms.length} farms.`);
    return farms;
  };

  const fetchWalletInfo = async () => {
    await wallet.getWalletInfo();
  };

  const [farms] = await Promise.all([fetchFarm(), fetchWalletInfo()]);
  console.log("---------------------------------");
  let questions = generateQuestions(wallet);

  while (true) {
    const answer = await inquirer.prompt(questions);

    switch (answer.category) {
      case "walletInfo":
        console.log(
          `${
            wallet.hbarBalance.currency.symbol
          } balance:  ${wallet.hbarBalance.toExact()}`
        );
        console.log(
          `Last transaction: https://hashscan.io/${wallet.chain}/transaction/${wallet.transaction}`
        );
        const tokensBalance = wallet.tokensBalance.map((tokenAmount) => ({
          address: tokenAmount.token.address,
          token: tokenAmount.token.symbol,
          amount: tokenAmount.toExact(),
        }));

        if (tokensBalance.length > 0) {
          console.table(tokensBalance);
        }
        console.log("\n");
        break;
      case "listFarms":
        showFarmsFriendly(farms);
        console.log("\n");
        break;
      case "asssociateToken":
        await associateTokens(wallet);
        await fetchWalletInfo();
        break;
      case "transferToken":
        await transferTokens(wallet);
        await fetchWalletInfo();
        break;
      case "wrap":
        const success = await wrapHBAR(wallet);
        if(success){
          await fetchWalletInfo();
        }
        break;
      case "exit":
        console.log(chalk.gray("Closing..."));
        process.exit(0);
      default:
        console.log(chalk.red("Invalid option."));
        break;
    }

    questions = generateQuestions(wallet);
  }
}

module.exports = {
  walletOptions,
  validadeAddress,
};
