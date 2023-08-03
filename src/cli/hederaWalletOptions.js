const { ChainId } = require("@pangolindex/sdk");
const Web3 = require("web3").default;
const { HederaMultisigWallet, HederaWallet } = require("../hedera/Wallet");
const { getFarms, showFarmsFriendly } = require("../pangochef/utils");
const { isHederaIdValid } = require("../hedera/utils");
const inquirer = require("inquirer").default;

/**
 * Check if an address is hedera adress or evm address
 * @param {string} input
 * @returns {string | true}
 */
function validadeAddress(input) {
  return (
    isHederaIdValid(input) ||
    Web3.utils.isAddress(Web3.utils.toChecksumAddress(input) ?? "") ||
    "Not is valid address."
  );
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
      name: "Associate a token.",
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
 *
 * @param {ChainId} chainId
 * @param {HederaMultisigWallet | HederaWallet} wallet
 */
async function walletOptions(wallet) {
  const farms = await getFarms(wallet.chainId);
  await wallet.getWalletInfo();

  const questions = generateQuestions(wallet);

  let answer = await inquirer.prompt(questions);

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
      console.table(tokensBalance);
      break;
    case "listFarms":
      showFarmsFriendly(farms);
      break;
    case "exit":
      console.log("Closing...");
      process.exit(0);
    default:
      console.log("Invalid option.");
      break;
  }
}

module.exports = {
  walletOptions,
};
