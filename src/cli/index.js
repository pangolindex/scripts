const inquirer = require("inquirer");
const TreePrompt = require("inquirer-tree-prompt");
const { getFarms, showFarmsFriendly } = require("../pangochef/utils.js");
const { ALL_CHAINS, ChainId } = require("@pangolindex/sdk");

inquirer.registerPrompt("tree", TreePrompt);
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
      type: "tree",
      name: "option",
      message: "Select a option",
      tree: [
        {
          name: "Pangochef",
          value: "",
          open: true,
          children: [
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
      ],
    },
  ];

  let answers = await inquirer.prompt(questions);

  if (answers.option.startsWith("LISTPANGO")) {
    const farms = await getFarms(answers.chain);

    switch (answers.option) {
      case "LISTPANGOACTIVE":
        showFarmsFriendly(farms.filter((farm) => farm.weight > 0));
        break;
      case "LISTPANGOACTIVE":
        showFarmsFriendly(farms.filter((farm) => farm.weight > 0));
        break;
      case "LISTPANGOSUPER":
        showFarmsFriendly(farms.filter((farm) => farm.extraRewards.length > 0));
        break;
      case "LISTPANGOSUPERACTIVE":
        showFarmsFriendly(farms.filter((farm) => farm.weight > 0 && farm.extraRewards.length > 0));
        break;
      default:
        showFarmsFriendly(farms);
        break;
    }
  }
}

main();
