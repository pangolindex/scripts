const { ChainId, TokenAmount } = require("@pangolindex/sdk");
const { HederaMultisigWallet, HederaWallet } = require("../hedera/Wallet");
const { getFarms, showFarmsFriendly } = require("../pangochef/utils");
const { isValidAddress, toTokenId } = require("../hedera/utils");
const inquirer = require("inquirer");
const Helpers = require("../core/helpers");

/**
 * Validade if a input is an herdera address or evm
 * @param {string} input
 * @returns {string | true}
 */
function validadeAddress(input) {
  return isValidAddress(input) || "Not is valid address.";
}

/**
 * @param {HederaMultisigWallet | HederaWallet} wallet
 */
function generateQuestions(wallet) {
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
      name: "Associate a multiple tokens.",
      value: "asssociateToken",
    },
    {
      name: "Wrap HBAR into WHBAR.",
      value: "wrap",
    },
    {
      name: "Uwrap WHBAR into HBAR.",
      value: "unwrap",
    },
  ];

  if (wallet instanceof HederaMultisigWallet) {
    choices.push({
      name: "List Thresholds and Admin accounts",
      value: "listMultisigInfo",
    });
  }

  if (wallet.hbarBalance.greaterThan("0")) {
    choices.push(
      {
        name: "Transfer HBAR.",
        value: "transferHBAR",
      },
      {
        name: "Transfer HBAR to multiple addresses.",
        value: "transferHBARMultiple",
      }
    );
  }

  if (wallet.tokensBalance.some((balance) => balance.greaterThan("0"))) {
    choices.push(
      {
        name: "Transfer a token.",
        value: "transferToken",
      },
      {
        name: "Transfer a tokens to multiple addresses.",
        value: "transferTokens",
      }
    );
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
    message: "Select a option: ",
    choices: choices,
  };
}

/**
 * This function receive a answers about associateTokens and associate it
 * @param {HederaMultisigWallet | HederaWallet} wallet
 */
async function associateTokens(wallet) {
  const tokensAddresses = [];
  while (true) {
    const answers = await inquirer.prompt([
      {
        message: "Enter with token address: ",
        name: "tokenAddress",
        type: "input",
        validate: validadeAddress,
        transform: (input) => {
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

  const questions = generateQuestions(wallet);

  while (true) {
    const answer = await inquirer.prompt(questions);

    switch (answer.category) {
      case "walletInfo":
        console.log(`HBAR balance:  ${wallet.hbarBalance.toExact()}`);
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
        break;
      case "exit":
        console.log("Closing...");
        process.exit(0);
      default:
        console.log("Invalid option.");
        break;
    }
  }
}

module.exports = {
  walletOptions,
  validadeAddress,
};
