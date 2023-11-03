const { ChainId } = require("@pangolindex/sdk");
const { HederaMultisigWallet } = require("../hedera/Wallet.js");

// FUnction to create a proposal
async function main() {
  const multisig = new HederaMultisigWallet(
    "0x00000000000000000000000000000000002d3c32",
    ChainId.HEDERA_MAINNET
  );

const proposeDescription = `# Test Proposal

## Overview

This is a test transaction to send **1 HBAR** to a developer wallet. Please vote positively`;

  await multisig.submitProposal(
    "0x0000000000000000000000000000000000316e89", // govenor address
    ["0x000000000000000000000000000000000010bc60"], // targets
    [100000000], // values to send to targets
    [""], // function signatures case will call a function from another contract
    [new Uint8Array([0])], // data to send in call fo function
    proposeDescription, // propose description
    994 // nft id
  );
return;
}

main().catch((reason) => console.log("Error to propose: ", reason)).finally();
