const {
  ChainId,
  TokenAmount,
  CurrencyAmount,
  Token,
  CHAINS,
  ChefType,
} = require("@pangolindex/sdk");
const { HederaMultisigWallet, HederaWallet } = require("../hedera/Wallet");
const { getFarms, showFarmsFriendly } = require("../pangochef/utils");
const {
  isValidAddress,
  toTokenId,
  tokenAddressToContractAddress,
} = require("../hedera/utils");
const inquirer = require("inquirer");
const Helpers = require("../core/helpers");
const chalk = require("chalk");
const { ZERO_ADDRESS } = require("../../config/address.json");
/**
 * Validate if a input is an herdera address or evm
 * @param {string} input
 * @returns {string | true}
 */
function validateAddress(input) {
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
      name: "Set weights of farms.",
      value: "setWeights",
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
    // {
    //   name: "Submit a proposal.",
    //   value: "submitProposal",
    // },
    {
      name: "Execute a proposal.",
      value: "executeProposal",
    },
    {
      name: "Cancel a proposal.",
      value: "cancelProposal",
    },
    {
      name: "Queue proposal.",
      value: "queueProposal",
    },
    {
      name: "Vote in proposal",
      value: "castVote",
    },
    {
      name: "Refetch wallet info.",
      value: "refetchWalletInfo",
    },
    {
      name: "Refetch farms",
      value: "refetchFarms",
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
        validate: validateAddress,
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

  const txId = await wallet.tokenAssociate(tokens);
  return !!txId;
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
        validate: validateAddress,
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

  const txId = await wallet.transferTokens(tokensAmount, recipients);
  return !!txId;
}

/**
 * This function wrap hbar into whbar
 * @param {HederaMultisigWallet | HederaWallet} wallet
 */
async function wrapHBAR(wallet) {
  const chain = CHAINS[wallet.chainId];

  const answer = await inquirer.prompt({
    message: "Enter with amount to wrap:",
    name: "amount",
    type: "number",
    validate: (input) => {
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

  const whbarTokenAddress = chain.contracts?.wrapped_native_token;
  if (!whbarTokenAddress) {
    console.log(chalk.red("Error, this chain don't have wrapped contract!"));
    return false;
  }

  const whbarContractAddress = tokenAddressToContractAddress(whbarTokenAddress);
  const amount = convertToAmount(answer.amount, wallet.hbarBalance);
  const txId = await wallet.wrap(whbarContractAddress, amount);
  return !!txId;
}

/**
 * This function unwrap whbar into hbar
 * @param {HederaMultisigWallet | HederaWallet} wallet
 */
async function unwrapHBAR(wallet) {
  const chain = CHAINS[wallet.chainId];

  const whbarBalance = wallet.tokensBalance.find(
    (tokenBalance) =>
      tokenBalance.token.address.toLowerCase() ===
      chain.contracts?.wrapped_native_token?.toLowerCase()
  );

  if (!whbarBalance) {
    console.log(
      chalk.red("Error, this account don't have wrapped token balance!")
    );
    return false;
  }

  const answer = await inquirer.prompt({
    message: "Enter with amount to unWrap:",
    name: "amount",
    type: "number",
    validate: (input) => {
      const rawAmount = convertToAmount(input, wallet.hbarBalance);
      return (
        (input > 0 && !whbarBalance.lessThan(rawAmount)) || "Invalid input."
      );
    },
    transformer: (input) => {
      return isNaN(input) || input <= 0 ? "" : input;
    },
  });

  const whbarContractAddress = tokenAddressToContractAddress(
    whbarBalance.token.address
  );
  const amount = convertToAmount(answer.amount, whbarBalance);
  const approveTx = await wallet.approve(whbarContractAddress, amount);
  if (approveTx) {
    const txId = await wallet.unwrap(whbarContractAddress, amount);
    return !!txId;
  }
  return false;
}
/**
 * This function add a new farm in pangochef
 * @param {HederaMultisigWallet | HederaWallet} wallet
 * @param {any[]} farms
 */
async function addFarm(wallet, farms) {
  const chain = CHAINS[wallet.chainId];

  if (
    !chain.contracts?.mini_chef ||
    chain.contracts?.mini_chef?.type !== ChefType.PANGO_CHEF
  ) {
    console.log(chalk.red("Error, this chain don't have pangochef!"));
    return false;
  }

  const answer = await inquirer.prompt([
    {
      message: "Enter with fungible token address:",
      name: "tokenAddress",
      type: "input",
      validate: validateAddress,
      filter: (input) => {
        return Helpers.toChecksumAddress(
          `0x${toTokenId(input).toSolidityAddress()}`
        );
      },
    },
    {
      message: (answers) => {
        return `Confirm to add new farm with recipient ${
          answers.tokenAddress
        } (estimated pid: ${farms.length + 1})?`;
      },
      name: "confirmAdd",
      type: "confirm",
    },
  ]);

  const tokenAddress = answer.tokenAddress;
  const contractAddress = tokenAddressToContractAddress(tokenAddress);

  const { token0: token0Map, token1: token1Map } =
    await Helpers.getPairsTokensCachedViaMulticall(
      [contractAddress],
      wallet.chainId
    );

  const token0Address = token0Map[contractAddress];
  const token1Address = token1Map[contractAddress];

  if (!token0Address || !token1Address) {
    console.log(chalk.red("Error, not valid pair token address."));
    return false;
  }

  if (!answer.confirmAdd) {
    return false;
  }

  const pangochefAddress = chain.contracts.mini_chef.address;

  const tokensMap = await Helpers.getTokensCached(
    [token0Address, token1Address],
    wallet.chainId
  );

  console.log(
    chalk.blue(
      `Adding new farm with tokens ${tokensMap[token0Address].symbol} and ${tokensMap[token1Address].symbol}.`
    )
  );
  const txId = await wallet.addFarm(
    pangochefAddress,
    tokenAddress,
    contractAddress
  );
  return !!txId;
}

/**
 * This function set new weights to farms
 * @param {HederaMultisigWallet | HederaWallet} wallet
 * @param {import("../pangochef/utils").Farm[]} farms
 */
async function setFarmsWeights(wallet, farms) {
  const pangocheftAddress =
    CHAINS[wallet.chainId].contracts?.mini_chef?.address;

  if (!pangocheftAddress) {
    console.log(chalk.red("Error, don't have pangochef in this chain"));
    return false;
  }

  const _farms = farms.reduce((acc, farm) => {
    acc[farm.pid] = farm;
    return acc;
  }, {});

  const farmsCopy = { ..._farms };

  const pids = [];
  const weights = [];

  while (true) {
    const farmsChoices = Object.values(farmsCopy);
    const answers = await inquirer.prompt([
      {
        message: "Select a farm",
        name: "farm",
        type: "list",
        choices: farmsChoices.map((farm) => {
          return {
            name: `PID: ${farm.pid} - ${farm.token0?.symbol}-${farm.token1?.symbol}`,
            value: farm.pid,
          };
        }),
      },
      {
        message: "Enter with new weight:",
        name: "weight",
        type: "number",
      },
      {
        message: "Change weight from another farm?",
        name: "continue",
        type: "confirm",
        when: () => {
          return pids.length > 0 && farmsChoices.length > 1;
        },
      },
    ]);

    //delete from choices the selected farm
    delete farmsCopy[answers.farm];
    pids.push(answers.farm);
    weights.push(answers.weight);

    if (pids.length > 1 && !answers.continue) {
      break;
    }
  }

  const totalAllocPoints = farms.reduce((sum, { weight }) => sum + weight, 0);
  const newTotalAllocPoints =
    weights.reduce((sum, weight) => sum + weight, 0) +
    Object.values(farmsCopy).reduce((sum, { weight }) => sum + weight, 0);

  if (totalAllocPoints !== newTotalAllocPoints) {
    console.log(
      chalk.red(
        `Error, total of new weights (${newTotalAllocPoints}) not is same of old weights (${totalAllocPoints})`
      )
    );
    return false;
  }

  console.table(
    pids.reduce((acc, pid, index) => {
      const newWeight = weights[index];
      const oldWeight = _farms[pid].weight;
      acc.push({
        pid,
        newWeight,
        oldWeight,
        delta: newWeight - oldWeight,
      });
      return acc;
    }, [])
  );

  const answer = await inquirer.prompt({
    message: "Confirm to change the farm weights?",
    name: "confirmChange",
    type: "confirm",
  });

  if (!answer.confirmChange) return false;

  const txId = await wallet.setWeights(pangocheftAddress, pids, weights);
  return !!txId;
}

/**
 * This function set a new rewarder to a farm
 * @param {HederaMultisigWallet | HederaWallet} wallet
 * @param {import("../pangochef/utils").Farm[]} farms
 */
async function addRewarder(wallet, farms) {
  const pangocheftAddress =
    CHAINS[wallet.chainId].contracts?.mini_chef?.address;

  if (!pangocheftAddress) {
    console.log(chalk.red("Error, don't have pangochef in this chain"));
    return false;
  }

  const farmsChoice = farms
    .filter((farm) => farm.poolType === 1 && farm.rewarder === ZERO_ADDRESS)
    .map((farm) => ({
      name: `PID: ${farm.pid} ${farm.token0.symbol}-${farm.token1.symbol}`,
      value: farm,
    }));

  const answers = await inquirer.prompt([
    {
      message: "Select a farm:",
      name: "farm",
      type: "list",
      choices: farmsChoice,
    },
    {
      message: "Enter with new rewarder contract address:",
      name: "contractAddress",
      type: "input",
      validate: validateAddress,
    },
    {
      message: (prevAnswers) => {
        const farm = prevAnswers.farm;
        return `Confirm to set ${prevAnswers.contractAddress} rewaerder to PID: ${farm.pid} ${farm.token0.symbol}-${farm.token1.symbol}`;
      },
      name: "confirmSetRewader",
      type: "confirm",
    },
  ]);

  if (!answers.confirmSetRewader) return false;

  const txId = wallet.addRewarder(
    pangocheftAddress,
    answers.farm.pid,
    answers.contractAddress
  );
  return !!txId;
}

/**
 * This function funds farm reward contracts with HBAR
 * @param {HederaMultisigWallet | HederaWallet} wallet
 * @param {import("../pangochef/utils").Farm[]} farms
 */
async function fundRewardersHBAR(wallet, farms) {
  const superFarms = farms.filter(
    (farm) => farm.poolType === 1 && farm.rewarder !== ZERO_ADDRESS
  );

  if (superFarms.length === 0) {
    console.log(chalk.red("Don't have superfarms on this chain."));
    return;
  }

  const _farms = superFarms.reduce((acc, farm) => {
    acc[farm.pid] = farm;
    return acc;
  }, {});
  const selectedFarms = [];
  const amounts = [];

  while (true) {
    const farmsChoices = Object.values(_farms);
    const remainHBAR = amounts.reduce(
      (remain, amount) => remain.subtract(amount),
      wallet.hbarBalance
    );

    const answers = await inquirer.prompt([
      {
        message: "Select a superfarm",
        name: "farm",
        type: "list",
        choices: farmsChoices.map((farm) => {
          return {
            name: `PID: ${farm.pid} - ${farm.token0?.symbol}-${farm.token1?.symbol} = ${farm.rewarder}`,
            value: farm,
          };
        }),
      },
      {
        message: `Remain HBAR in wallet ${remainHBAR.toExact()}, Enter with HBAR amount:`,
        name: "amount",
        type: "number",
        validate: (input) => {
          const rawAmount = convertToAmount(input, wallet.hbarBalance);
          return (
            (input > 0 && remainHBAR.greaterThan(rawAmount)) || "Invalid input."
          );
        },
        transformer: (input) => {
          return isNaN(input) || input < 0 ? "" : input;
        },
      },
      {
        message: "Fund another superfarm?",
        name: "continue",
        type: "confirm",
        when: () => {
          return farmsChoices.length > 1;
        },
      },
    ]);

    //delete from choices the select farm
    delete _farms[answers.farm.pid];
    selectedFarms.push(answers.farm);
    amounts.push(convertToAmount(answers.amount, wallet.hbarBalance));

    if (!answers.continue) {
      break;
    }
  }

  console.table(
    selectedFarms.reduce((acc, farm, index) => {
      const amount = amounts[index];
      acc.push({
        pid: farm.pid,
        token0: farm.token0.symbol,
        token1: farm.token1.symbol,
        rewarder: farm.rewarder,
        amount: amount.toExact(),
      });
      return acc;
    }, [])
  );

  const answer = await inquirer.prompt({
    message: "Confirm to fund these farms?",
    name: "confirmFund",
    type: "confirm",
  });

  if (!answer.confirmFund) return false;

  const chain = CHAINS[wallet.chainId];
  const whbarTokenAddress = chain.contracts?.wrapped_native_token;
  if (!whbarTokenAddress) {
    console.log(chalk.red("Error, this chain don't have wrapped contract!"));
    return false;
  }

  const whbarContractAddress = tokenAddressToContractAddress(whbarTokenAddress);
  const rewarders = selectedFarms.map((farm) => farm.rewarder);
  const txId = await wallet.fundRewardersWithWHBAR(
    whbarContractAddress,
    rewarders,
    amounts
  );
  return !!txId;
}

/**
 * This function funds farm reward contracts with tokens
 * @param {HederaMultisigWallet | HederaWallet} wallet
 * @param {import("../pangochef/utils").Farm[]} farms
 */
async function fundRewardersTokens(wallet, farms) {
  const superFarms = farms.filter(
    (farm) => farm.poolType === 1 && farm.rewarder !== ZERO_ADDRESS
  );

  if (superFarms.length === 0) {
    console.log(chalk.red("Don't have superfarms on this chain."));
    return;
  }

  const selectedFarms = [];
  const amounts = [];

  const tokens = wallet.tokensBalance.filter((balance) =>
    balance.greaterThan(0)
  );

  while (true) {
    const answers = await inquirer.prompt([
      {
        message: "Select a superfarm",
        name: "farm",
        type: "list",
        choices: superFarms.map((farm) => {
          return {
            name: `PID: ${farm.pid} - ${farm.token0?.symbol}-${farm.token1?.symbol} = ${farm.rewarder}`,
            value: farm,
          };
        }),
      },
      {
        message: "Select a token",
        name: "token",
        type: "list",
        choices: tokens.map((balance) => ({
          name: `${balance.token.symbol} balance: ${balance.toExact()}`,
          value: balance,
        })),
      },
      {
        message: (prevAnswers) => {
          const token = prevAnswers.token.token;
          return `Enter with ${token.symbol} amount:`;
        },
        name: "amount",
        type: "number",
        validate: (input, prevAnswers) => {
          const rawAmount = convertToAmount(input, prevAnswers.token);
          return (
            (input > 0 && !prevAnswers.token.lessThan(rawAmount)) ||
            "Invalid input."
          );
        },
        transformer: (input) => {
          return isNaN(input) || input < 0 ? "" : input;
        },
      },
      {
        message: "Fund another superfarm/ fund with another token?",
        name: "continue",
        type: "confirm",
      },
    ]);

    selectedFarms.push(answers.farm);
    amounts.push(convertToAmount(answers.amount, answers.token));

    if (!answers.continue) {
      break;
    }
  }

  console.table(
    selectedFarms.reduce((acc, farm, index) => {
      const amount = amounts[index];
      acc.push({
        pid: farm.pid,
        token0: farm.token0.symbol,
        token1: farm.token1.symbol,
        rewarder: farm.rewarder,
        amount: `${amount.toExact()} ${amount.token.symbol}`,
      });
      return acc;
    }, [])
  );

  const answer = await inquirer.prompt({
    message: "Confirm to fund these farms?",
    name: "confirmFund",
    type: "confirm",
  });

  if (!answer.confirmFund) return false;

  const rewarders = selectedFarms.map((farm) => farm.rewarder);
  const txId = await wallet.fundRewardersWithTokens(rewarders, amounts);
  return !!txId;
}

/**
 * This function execute a proposal
 * @param {HederaMultisigWallet | HederaWallet} wallet
 */
async function executeProposal(wallet) {
  const chain = CHAINS[wallet.chainId];
  const governorAddress = chain.contracts?.governor?.address;

  if (!governorAddress) {
    console.log(chalk.red("Don't have governance contract on this chain!"));
    return;
  }

  const answer = await inquirer.prompt({
    message: "Enter with proposal id:",
    name: "proposalId",
    type: "number",
  });

  await wallet.executeProposal(governorAddress, answer.proposalId);
}

/**
 * This function queue a proposal to timelock
 * @param {HederaMultisigWallet | HederaWallet} wallet
 */
async function queueProposal(wallet) {
  const chain = CHAINS[wallet.chainId];
  const governorAddress = chain.contracts?.governor?.address;

  if (!governorAddress) {
    console.log(chalk.red("Don't have governance contract on this chain!"));
    return;
  }

  const answer = await inquirer.prompt({
    message: "Enter with proposal id:",
    name: "proposalId",
    type: "number",
  });

  await wallet.queueProposal(governorAddress, answer.proposalId);
}

/**
 * This function cancel a proposal
 * @param {HederaMultisigWallet | HederaWallet} wallet
 */
async function cancelProposal(wallet) {
  const chain = CHAINS[wallet.chainId];
  const governorAddress = chain.contracts?.governor?.address;

  if (!governorAddress) {
    console.log(chalk.red("Don't have governance contract on this chain!"));
    return;
  }

  const answer = await inquirer.prompt({
    message: "Enter with proposal id:",
    name: "proposalId",
    type: "number",
  });

  await wallet.cancelProposal(governorAddress, answer.proposalId);
}

async function castVote(wallet) {
  const chain = CHAINS[wallet.chainId];
  const governorAddress = chain.contracts?.governor?.address;

  if (!governorAddress) {
    console.log(chalk.red("Don't have governance contract on this chain!"));
    return;
  }

  const answer = await inquirer.prompt([
    {
      message: "Enter with proposal id:",
      name: "proposalId",
      type: "number",
    },
    {
      message: "Enter with nft id to vote:",
      name: "nftId",
      type: "number",
    },
    {
      message: "Y for, N against",
      name: "support",
      type: "confirm",
    },
  ]);

  await wallet.castVote(
    governorAddress,
    answer.proposalId,
    answer.support,
    answer.nftId
  );
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

  let [farms] = await Promise.all([fetchFarm(), fetchWalletInfo()]);
  console.log("---------------------------------");
  let questions = generateQuestions(wallet);

  while (true) {
    const answer = await inquirer.prompt(questions);
    let success = false;
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
        success = await associateTokens(wallet);
        if (success) {
          await Helpers.sleep(5000);
          await fetchWalletInfo();
        }
        break;
      case "transferToken":
        success = await transferTokens(wallet);
        if (success) {
          await Helpers.sleep(5000);
          await fetchWalletInfo();
        }
        break;
      case "wrap":
        success = await wrapHBAR(wallet);
        if (success) {
          await Helpers.sleep(5000);
          await fetchWalletInfo();
        }
        break;
      case "unwrap":
        success = await unwrapHBAR(wallet);
        if (success) {
          await Helpers.sleep(5000);
          await fetchWalletInfo();
        }
        break;
      case "addFarm":
        success = await addFarm(wallet, farms);
        if (success) {
          await Helpers.sleep(5000);
          farms = await fetchFarm();
        }
        break;
      case "setWeights":
        success = await setFarmsWeights(wallet, farms);
        if (success) {
          await Helpers.sleep(5000);
          farms = await fetchFarm();
        }
        break;
      case "addRewarder":
        success = await addRewarder(wallet, farms);
        if (success) {
          await Helpers.sleep(5000);
          farms = await fetchFarm();
        }
        break;
      case "fundRewardersHBAR":
        await fundRewardersHBAR(wallet, farms);
        if (success) {
          await Helpers.sleep(5000);
          farms = await fetchWalletInfo();
        }
        break;
      case "fundRewardersTokens":
        await fundRewardersTokens(wallet, farms);
        break;
      case "executeProposal":
        await executeProposal(wallet);
        break;
      case "queueProposal":
        await queueProposal(wallet);
        break;
      case "cancelProposal":
        await cancelProposal(wallet);
        break;
      case "queueProposal":
        await queueProposal(wallet);
        break;
      case "castVote":
        await castVote(wallet);
        break;
      case "listMultisigInfo":
        await wallet.listAdmins();
      case "refetchWalletInfo":
        await fetchWalletInfo();
        break;
      case "refetchFarms":
        farms = await fetchFarm();
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
  validateAddress,
};
