const inquirer = require("inquirer");
const { getFarms, showFarmsFriendly } = require("../pangochef/utils.js");
const {
  ALL_CHAINS,
  ChainId,
  CHAINS,
  ChefType,
  NetworkType,
} = require("@pangolindex/sdk");
const { walletOptions, validateAddress } = require("./hederaWalletOptions.js");
const { HederaWallet, HederaMultisigWallet } = require("../hedera/Wallet.js");

const chains = ALL_CHAINS.filter((chain) => chain.pangolin_is_live);

async function main() {
  const questions = [
    {
      type: "list",
      name: "chain",
      message: "Select a chain",
      default: ChainId.AVALANCHE,
      choices: chains.map((chain) => ({
        name: chain.name,
        value: chain.chain_id,
      })),
    },
    {
      type: "list",
      name: "category",
      message: "Select a category",
      choices: (answers) => {
        const _choices = [];

        CHAINS[answers.chain].contracts?.mini_chef?.type ===
          ChefType.PANGO_CHEF &&
          _choices.push({
            name: "🡒 Pangochef",
            value: "PANGOCHEF",
            short: "🡓 Pangochef",
          });

        CHAINS[answers.chain].contracts?.mini_chef?.type ===
          ChefType.MINI_CHEF_V2 &&
          _choices.push({
            name: "🡒 Minichef",
            value: "MINICHEF",
            short: "🡓 Minichef",
          });

        CHAINS[answers.chain].network_type === NetworkType.HEDERA &&
          _choices.push(
            new inquirer.Separator(),
            {
              name: "🡒 Hedera Wallet",
              value: "HEDERAWALLET",
              short: "🡓 Hedera Wallet",
            },
            {
              name: "🡒 Hedera Multisig",
              value: "HEDERAWALLETMULTISIG",
              short: "🡓 Hedera Multisig",
            }
          );

        return _choices;
      },
    },
    {
      type: "list",
      name: "pangochef",
      message: "Select a pangochef option",
      when: (answers) => {
        return answers.category === "PANGOCHEF";
      },
      choices: [
        {
          name: "List all farms.",
          value: "LISTPANGO",
          short: "List all pangochef farms.",
        },
        {
          name: "List active farms.",
          value: "LISTPANGOACTIVE",
          short: "List all active pangochef farms.",
        },
        {
          name: "List all superfarms.",
          value: "LISTPANGOSUPER",
          short: "List all pangochef super farms.",
        },
        {
          name: "List active superfarms.",
          value: "LISTPANGOSUPERACTIVE",
          short: "List all active pangochef superfarms.",
        },
      ],
    },
  ];

  const answers = await inquirer.prompt(questions);

  if (answers.category.startsWith("HEDERAWALLET")) {
    let wallet;
    if (answers.category === "HEDERAWALLETMULTISIG") {
      const addressAnswer = await inquirer.prompt({
        type: "input",
        name: "address",
        message: "Enter with multisig wallet address",
        validate: validateAddress,
      });
      wallet = new HederaMultisigWallet(addressAnswer.address, answers.chain);
    } else {
      wallet = new HederaWallet(answers.chain);
    }
    await walletOptions(wallet);
  }

  if (answers.pangochef?.startsWith("LISTPANGO")) {
    const farms = await getFarms(answers.chain);

    switch (answers.pangochef) {
      case "LISTPANGOACTIVE":
        showFarmsFriendly(farms.filter((farm) => farm.weight > 0));
        break;
      case "LISTPANGOSUPER":
        showFarmsFriendly(farms.filter((farm) => farm.extraRewards.length > 0));
        break;
      case "LISTPANGOSUPERACTIVE":
        showFarmsFriendly(
          farms.filter(
            (farm) => farm.weight > 0 && farm.extraRewards.length > 0
          )
        );
        break;
      default:
        showFarmsFriendly(farms);
        break;
    }
  }

  process.exit(0);
}

main();
