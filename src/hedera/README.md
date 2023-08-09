# Hedera scripts
This folder contains some useful functions to interact with hedera network.

## Fetcher
This class is used to fetch some data in hedera mirror nodes.

```js
const { ChainId } = require("@pangolindex/sdk");

const apiFetcher  = new HederaFetcher(ChainId.HEDERA_MAINNET); // fetch data from hedera mainnet
```

### getWalletInfo
This function get information about a account, hbar balance in wallet, tokens balances in wallet and last transaction id.

```js
const data = await apiFetcher.getWalletInfo("0.0.00001");
```

### getWalletTokens
This function get the get only the tokens associates a account and return the aray with tokens id.

```js
const data = await apiFetcher.getWalletTokens("0.0.00001");
```


## Wallet
This class have some function to transfer tokens, associate to token, wrap/unwrap hbar and interact with admin function of pangolin contracts.

### How to use
First copy the `.env.example` to `.env` and paste your address and your private key in `WALLET_ADDRESS` and `WALLET_KEY`. if you will use the single wallet the private key is used to send the transactions, if you are going to use multisig this is used to validate de admin to send the transaction.


### HederaWallet
This class use a single hedera wallet to send the transactions.

```js
const wallet = new HederaWallet(ChainId.HEDERA_MAINNET);
```


### HederaMultisigWallet
This class use a multisig hedera wallet to send the transactions.
```js
const address = "0x00...01" // can be hedera id 0.0.00001
const wallet = new HederaMultisigWallet(address, ChainId.HEDERA_MAINNET);
```

#### tokenAssociate
This function associate to multiple tokens.

```js 
await wallet.tokenAssociate(["0x00...01", "0.0.00001"]);
```

#### transferTokens
This function transfer multiple tokens.

```js
const tokens = [new TokenAmount(token0, 1), new TokenAmount(token2, 2)];
const recipients = ["0x00...01", "0.0.00001"];
await wallet.transferTokens(tokens, recipients)
```

#### addFarm
This function add a new farm to pangochef contract.

```js
const pangoChefAddress = "0x0...0";
const tokenAddress = "0x0...02"; // address of PGL fungile token
const pairContract = "0x0...01"; // address of token contract
const await wallet.addFarm(pangochefAddress, tokenAddress, pairContract);
```

#### setWeights
This function set a weights of farms. Weights are used to determine the percentage of png to be distribute to farms.

```js
const pangoChefAddress = "0x0...0";
const poolIds = [0,1]; // id of each pool
const newWeights = [5000, 5000]; // new weight of each pool 
await wallet.setWeights(pangoChefAddress, poolIds, newWeights);
```

#### wrap
This function wrap hbar into whbar token.

```js
const { CurrencyAmount, ChainId, CAVAX } = require("@pangolindex/sdk");

const whbarAddress = "0x0...0";
const amount = CurrencyAmount.fromRawAmount(CAVAX[ChainId.HEDERA_MAINNET], 1); // amount in tiny bars
const txId = await wallet.wrap(whbarAddress, amount);
```

#### unrap
This function unwrap whbar token into hbar.

```js
const { CurrencyAmount, ChainId, WAVAX } = require("@pangolindex/sdk");

const whbarAddress = "0x0...0";
const amount = new TokenAmount(WAVAX[ChainId.HEDERA_MAINNET], 1); // amount in tiny bars
const txId = await wallet.unrap(whbarAddress, amount);
```

#### approve
This function approve a allowance to spender address.

```js
const spender = "0x0...0";
const amount = new TokenAmount(token, 1);
const txId = await wallet.approve(spender, amount);
```

#### addRewarder
This function add a rewarder contract to a farm, this is used to create a new superfarm.

```js
const pangoChefAddress = "0x0...0";
const poolId = 0; // id of pool
const rewarderAddress = "0x0...1"; // address of rewarder
const txId = await wallet.addRewarder(pangoChefAddress, poolId, rewarderAddress);
```

#### fundRewardersWithWHBAR
This function is used to fund the rewarders contracts with whbar, so this wrap hbar into whbar and transfer the tokens to rewarders contracts.

```js
const whbarAddress = "0x0...0";
const rewardersAddresses = ["0x0...0", "0x0...0", "0x0...0"];
const currency = CAVAX[ChainId.HEDERA_MAINNET];
const amounts = [CurrencyAmount.fromRawAmount(currency, 1), CurrencyAmount.fromRawAmount(currency, 2)];
const txId = await wallet.fundRewardersWithWHBAR(whbarAddress, rewardersAddresses, amounts);
```

#### fundRewardersWithTokens
This function is used to fund the rewarders contracts with tokens.

```js
const rewardersAddresses = ["0x0...0", "0x0...0", "0x0...0"];
const amounts = [new TokenAmount(token0, 1), new TokenAmount(token1, 2)];
const txId = await wallet.fundRewardersWithTokens(rewardersAddresses, amounts);
```

#### submitProposal
This function submit a new proposal in governance contract.

```js
const {ContractFunctionParameters} = require("@hashgraph/sdk");

const governorAddress = "0x0...0";
const targets ["0x0...1"]; // The ordered list of target addresses for calls to be made
const values = [0]; // The ordered list of values (i.e. msg.value) to be passed to the calls to be made
const signatures = ['setPendingAdmin(address)']; // The ordered list of function signatures to be called
const datas = [new ContractFunctionParameters().addAddress('0x0000000000000000000000000000000000e2907f')._build();]; // The ordered list of calldata to be passed to each call
const description = `# Implement GovernorPango

## What does this do?

By voting on this proposal, you wish to transition control from Governor to GovernorPango.
This contract lives at 0.0.14848127 and has similar mechanics as the current Governor but
allows changing the proposal threshold via governance vote.`; // proposal description
const nftId = 0; // id of nft to be use to create the proposal

await wallet.submitProposal(governorAddress, targets, values, signatures, datas, description, nftId);
```

#### executeProposal
This function execute a proposal.

```js
const governorAddress = "0x0...0";
const proposalId = 0;
await wallet.executeProposal(governorAddress, proposalId);
```

#### queueProposal
This function to queue a proposal to timelock.

```js
const governorAddress = "0x0...0";
const proposalId = 0;
await wallet.queueProposal(governorAddress, proposalId);
```

#### cancelProposal
This function to cancel a proposal.

```js
const governorAddress = "0x0...0";
const proposalId = 0;
await wallet.cancelProposal(governorAddress, proposalId);
```

#### castVote
This function to vote to a proposal.

```js
const governorAddress = "0x0...0";
const proposalId = 0;
const support = true; // true to vote yes, false to vote no
const nftId = 0; // id of nft to be use to vote
await wallet.castVote(governorAddress, proposalId, support, nftId);
```

#### getWalletInfo
This function get hbar balance, tokens balances in wallet and the last transaction of wallet.

```js
await wallet.getWalletInfo();
```