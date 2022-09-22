# Pangolin Scripts

## Overview

This repository contains a collection of commonly used scripts for maintaining a DEX like Pangolin. Most scripts are 
internally configuration driven to help avoid errors but there is always a risk especially when mis-configuring 
something. Some directories are driven by one higher level configuration file like `single_side_staking` to ensure the 
same information is used across multiple steps. Overall, the repo is meant to be tweaked as needed by devs and to hold 
the hands of users with light+ technical experience.


## Configuring your wallet

Some scripts make state changing on-chain calls which require your wallet to be connected. 
You can do this by following the instructions in the [configuration directory](./config/README.md)


## Directory overview

### `/src/core/`
This directory contains some core logic (think library) used to support other scripts in the repo. 
You shouldn't need to play around in here.

### `/src/bots/`
This directory contains bots which perform repetitive tasks for Pangolin.

### `/src/DaaS/`
This directory contains scripts to perform admin tasks for DeFi as a Servie (DaaS).

### `/src/governance/`
This directory contains scripts to interact with GovernorAlpha, the primary onchain governance mechanism for Pangolin. 
Notable functionality includes submitting a proposal, voting on a proposal, and executing a proposal.

### `/src/minichef/`
This directory contains scripts to interact with MiniChefV2, the contract driving Pangolin's primary system of 
incentivizing liquidity providers aka "farming." Notable functionality includes an overview of all the farms, 
deploying rewarders, adding farms, changing weights.

### `/src/multisig/`
This directory contains scripts to interact with different versions of DAOs commonly referred to as multi-signature 
wallets. Support is included for interacting with the gnosis multisig and gnosis safe. Notable functionality includes 
submitting transactions, confirming transactions, and executing transactions.

### `/src/pangochef/`
This directory contains scripts to interact with PangoChef, the contract driving Pangolin's primary system of
incentivizing liquidity providers aka "farming." Notable functionality includes an overview of all the pools,
initializing pools, changing weights, and modifying rewarders.

### `/src/single_side_staking/`
This directory contains scripts to interact with single side staking contracts. These are the contracts that power 
Pangolin's PNG staking programs. Support is included for different tasks to be done via a multisig or EOA. Notable 
functionality includes setting a program duration period, ownership management, and kicking off a staking program.

### `/src/util/`
This directory contains a collection of scripts aimed at understanding on-chain data better. Many of these scripts 
provide a GUI for related information. Notable functionality includes single side staking expirations and verification 
of tokenlist updates.

### `/python`
This directory contains all scripts written in python.

