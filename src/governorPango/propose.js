// Helper modules to provide common or secret values
const CONFIG = require('../../config/config');
const ADDRESS = require('../../config/address.json');
const CONSTANTS = require('../core/constants');
const GovernorPango = require('@pangolindex/exchange-contracts/artifacts/contracts/governance/GovernorPango.sol/GovernorPango.json');
const { propose: gnosisMultisigPropose } = require('../core/gnosisMultisig');
const { propose: gnosisSafePropose } = require('../core/gnosisSafe');
const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.RPC));
web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
let gasSpent = web3.utils.toBN(0);

// Change These Variables
// --------------------------------------------------
const governorPangoAddress = '0x17f6ce028a49F1679d83daaeE62412f86B67fa24';
const NFT_ID = 1;
const multisigAddress = ADDRESS.COSTON_GNOSIS_MULTISIG_ADDRESS;
const multisigType = CONSTANTS.GNOSIS_MULTISIG;
// --------------------------------------------------


(async () => {
    const governorPangoContract = new web3.eth.Contract(GovernorPango.abi, governorPangoAddress.toLowerCase());

    const VALUE = 0;
    const SIGNATURE1 = 'transfer(address,uint256)';

    const DATA1 = web3.eth.abi.encodeParameters(
        ['address', 'uint256'],
        [ADDRESS.PANGOLIN_GNOSIS_SAFE_ADDRESS, '4300000' + '0'.repeat(18)]
    );

    const tx = await governorPangoContract.methods.propose(
        [ADDRESS.PANGOLIN_COMMUNITY_TREASURY],
        [VALUE],
        [SIGNATURE1],
        [DATA1],
`# Introduce Concentrated Liquidity to Pangolin Avalanche

## Overview

TLDR: Move 4.3 million PNG from the on-chain treasury to fund seeding liquidity for a Concentrated Liquidity solution based on Uniswap V3 contracts and fund development costs.

## What is the goal?
If this proposal passes, 50% will seed LP and 50% will fund development costs. Concentrated liquidity offers more efficient markets and better flexibilities for liquidity providers. The Uni V3 license expired on April 1, 2023, so we can offer these contracts on Pangolin.

## What is changing?
The current contracts will run in tandem with V3, however the updated interface will prioritize v3 for trades but will notify users if a better trade is available on v2. The swap feature remains the same, the change will only affect those providing liquidity.

In the upcoming months, our intention is to implement a farming solution that leverages concentrated liquidity, ultimately driving sustainable growth and increased efficiency for PNG emissions.
 
## How does this impact users?
LPs will benefit by having a more flexible and capital-efficient AMM. Instead of allocating capital across the entire price range, LPs have full control over their desired liquidity-providing price ranges.

The Pangolin v2 contracts will remain operational in perpetuity, but we anticipate that v3's advantages will attract the most liquidity and trading volume.

There is no obligation to migrate your v2 liquidity, but migrating may be beneficial as the majority of trading volume, and LP fee generation are expected on v3.

https://pangolindex.medium.com/introduce-concentrated-liquidity-to-pangolin-avalanche-f7bacf52a1cc

## Technical Proposal
We will transfer 4,300,000 PNG from Community Treasury to Pangolin Multisig`,
        NFT_ID,
    );

    const gas = await tx.estimateGas({
        from: multisigAddress,
        gas: 8000000,
    });

    console.log(`Encoding bytecode ...`);
    const bytecode = tx.encodeABI();
    const fileName = path.basename(__filename, '.js');
    const fileOutput = path.join(__dirname, `${fileName}-bytecode.txt`);
    fs.writeFileSync(fileOutput, bytecode);
    console.log(`Encoded bytecode to ${fileOutput}`);
    console.log();

    switch (multisigType) {
        case CONSTANTS.GNOSIS_MULTISIG:
            const gnosisMultisigReceipt = await gnosisMultisigPropose({
                multisigAddress,
                destination: governorPangoAddress,
                value: 0,
                bytecode,
            });

            gasSpent.iadd(web3.utils.toBN(gnosisMultisigReceipt.effectiveGasPrice).mul(web3.utils.toBN(gnosisMultisigReceipt.gasUsed)));

            if (!gnosisMultisigReceipt?.status) {
                console.log(gnosisMultisigReceipt);
                process.exit(1);
            } else {
                console.log(`Transaction hash: ${gnosisMultisigReceipt.transactionHash}`);
            }
            break;
        case CONSTANTS.GNOSIS_SAFE:
            await gnosisSafePropose({
                multisigAddress,
                destination: governorPangoAddress,
                value: 0,
                bytecode,
            });
            break;
        case CONSTANTS.EOA:
            const baseGasPrice = await web3.eth.getGasPrice();

            console.log('Proposing via EOA ...');
            const eoaReceipt = await tx.send({
                from: multisigAddress,
                gas: gas,
                maxFeePerGas: baseGasPrice * 2,
                maxPriorityFeePerGas: web3.utils.toWei('1', 'nano'),
            });

            gasSpent.iadd(web3.utils.toBN(eoaReceipt.effectiveGasPrice).mul(web3.utils.toBN(eoaReceipt.gasUsed)));

            if (!eoaReceipt?.status) {
                console.error(eoaReceipt);
                process.exit(1);
            } else {
                console.log(`Transaction hash: ${eoaReceipt.transactionHash}`);
            }

            break;
        default:
            throw new Error(`Unknown multisig type: ${multisigType}`);
    }
})()
    .catch(console.error)
    .finally(async () => {
        console.log(`Gas spent: ${gasSpent / (10 ** 18)}`);
        process.exit(0);
    });
