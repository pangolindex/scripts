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
              value: "listPangochefFarms",
              short: "List all pangochef farms.",
            },
          ],
        },
      ],
    },
  ]; 

  let answers = await inquirer.prompt(questions);

  if (answers.option === "listPangochefFarms") {
    const farms = await getFarms(answers.chain);
    showFarmsFriendly(farms);
  }
}

main();
