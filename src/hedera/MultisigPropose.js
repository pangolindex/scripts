const config = require('../config');
const {
    Client, AccountId, TokenAssociateTransaction, PublicKey, TransactionId, Timestamp, AccountUpdateTransaction, KeyList, ContractExecuteTransaction,
    ContractFunctionParameters,
    TransferTransaction,
    ScheduleCreateTransaction
} = require('@hashgraph/sdk');
const ethers = require('ethers');

const DEPLOYMENT = require('../config/deployment.mainnet.json');
const client = config.clients.MAINNET;


let tx, receipt, record;

(async () => {
    // tx = await new TokenAssociateTransaction()
    //     .setTokenIds([
    //         AccountId.fromSolidityAddress(DEPLOYMENT['SSS NFT (HTS)']).toString(),
    //     ])
    //     .setAccountId(AccountId.fromSolidityAddress(DEPLOYMENT['Multisig']).toString())
    //     .setTransactionId(
    //         TransactionId.generate(
    //             AccountId.fromSolidityAddress(DEPLOYMENT['Multisig'])
    //         )
    //     );

    // tx = await new ContractExecuteTransaction()
    //     .setContractId(AccountId.fromSolidityAddress(DEPLOYMENT['TreasuryVester']).toString())
    //     .setFunction('transferInitialSupply',
    //         new ContractFunctionParameters()
    //             .addAddress(DEPLOYMENT['Multisig'])
    //     )
    //     .setTransactionId(
    //         TransactionId.generate(
    //             AccountId.fromSolidityAddress(DEPLOYMENT['Multisig'])
    //         )
    //     )
    //     .setGas(200_000);

    tx = await new ContractExecuteTransaction()
        .setContractId(AccountId.fromSolidityAddress(DEPLOYMENT['TreasuryVester']).toString())
        .setFunction('setRecipients',
            new ContractFunctionParameters()
                .addAddressArray(
                    [
                        '0x00000000000000000000000000000000001A88B5', // Community Treasury
                        // '0x00000000000000000000000000000000001A7e7e', // Multisig Ops
                        '0x00000000000000000000000000000000002d3c32', // New Multisig
                        '0x00000000000000000000000000000000001A88E2', // RewardFundingForwarder (PangoChef)
                    ]
                )
                .addInt64Array([1569, 1830, 6601])
        )
        .setGas(500_000);

    // const amount = 1000;
    // tx = await new TransferTransaction()
    //     .addHbarTransfer(AccountId.fromSolidityAddress(DEPLOYMENT['Multisig']).toString(), -1 * amount)
    //     .addHbarTransfer('0.0.1738574', amount)
    //     .setTransactionId(TransactionId.generate(AccountId.fromSolidityAddress(DEPLOYMENT['Multisig'])));

    // tx = await new AccountUpdateTransaction()
    //     .setAccountId(AccountId.fromSolidityAddress(DEPLOYMENT['Multisig']).toString())
    //     .setKey(
    //         new KeyList(
    //             [
    //                 PublicKey.fromString('0x3f019530ad6c8b1af16add1a0e30a2d5176d02ec61c1f229cafe84914929ad10'), // Brandon (0.0.1733478)
    //                 // PublicKey.fromString('0xa297a19e620ac1c2e094ca1aa3a043defcefe6ccd81ef6777f27ba1189fdbd6b'), // Efe (0.0.1083058)
    //                 PublicKey.fromString('0xd58994a9251156fd17ceede96d5a2495f645d74c2e54ff8ef49a29a1e6251861'), // Justin (0.0.931147)
    //                 PublicKey.fromString('0xf6982b3ab0edc9c0b24b64d42b637329aba90649dbc6efb81766c50ba0f07165'), // Sarju (0.0.1736298)
    //             ],
    //             1,
    //         )
    //     );
    //     // .setNodeAccountIds([AccountId.fromString('0.0.3')])
    //     // .setTransactionId(
    //     //     TransactionId.withValidStart(
    //     //         AccountId.fromSolidityAddress(DEPLOYMENT['Multisig']),
    //     //         Timestamp.fromDate(new Date('3/20/2023, 6:00:00 PM EST')),
    //     //     )
    //     // );

    // tx = await new ContractExecuteTransaction()
    //     .setContractId('0.0.3008388')
    //     // .setFunction('setMerkleRoot', new ContractFunctionParameters().addBytes32(ethers.utils.arrayify('0x3ff2567382ed77594ef366e2c89fdaab69ae366bd61842f9428e8771e8119d08')))
    //     .setFunction('unpause')
    //     // .setFunction('pause')
    //     .setTransactionId(
    //         TransactionId.generate(
    //             AccountId.fromSolidityAddress(DEPLOYMENT['Multisig'])
    //         )
    //     )
    //     .setGas(60_000);

    // tx = await new ContractExecuteTransaction()
    //     .setContractId(AccountId.fromSolidityAddress(DEPLOYMENT['PangoChef']).toString())
    //     .setFunction('grantRole',
    //         new ContractFunctionParameters()
    //             .addBytes32(ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.toUtf8Bytes('FUNDER_ROLE'))))
    //             .addAddress(`0x${AccountId.fromString(config.accounts.MAINNET_BOT.accountId).toSolidityAddress()}`)
    //     )
    //     .setTransactionId(
    //         TransactionId.generate(
    //             AccountId.fromSolidityAddress(DEPLOYMENT['Multisig'])
    //         )
    //     )
    //     .setGas(200_000);


    ////////////////
    // Fund Farms //
    ////////////////

    const daysMultiplier = 1;
    // tx = await new ContractExecuteTransaction()
    //     .setContractId(AccountId.fromSolidityAddress(DEPLOYMENT['WHBAR (Contract)']).toString())
    //     .setFunction('deposit')
    //     .setPayableAmount(160_000 * daysMultiplier)
    //     .setTransactionId(
    //         TransactionId.generate(
    //             AccountId.fromSolidityAddress(DEPLOYMENT['Multisig'])
    //         )
    //     )
    //     .setGas(100_000)
    // tx = await new TransferTransaction()
    //     .addTokenTransfer(AccountId.fromSolidityAddress(DEPLOYMENT['WHBAR (HTS)']).toString(), AccountId.fromSolidityAddress(DEPLOYMENT['Multisig']), -160_000e8 * daysMultiplier)
    //     .addTokenTransfer(AccountId.fromSolidityAddress(DEPLOYMENT['WHBAR (HTS)']).toString(), '0.0.2113639', 48_000e8 * daysMultiplier)
    //     .addTokenTransfer(AccountId.fromSolidityAddress(DEPLOYMENT['WHBAR (HTS)']).toString(), '0.0.2113643', 16_000e8 * daysMultiplier)
    //     .addTokenTransfer(AccountId.fromSolidityAddress(DEPLOYMENT['WHBAR (HTS)']).toString(), '0.0.2113649', 81_600e8 * daysMultiplier)
    //     .addTokenTransfer(AccountId.fromSolidityAddress(DEPLOYMENT['WHBAR (HTS)']).toString(), '0.0.2113653',  8_000e8 * daysMultiplier)
    //     .addTokenTransfer(AccountId.fromSolidityAddress(DEPLOYMENT['WHBAR (HTS)']).toString(), '0.0.2113656',  6_400e8 * daysMultiplier)
    //     .setTransactionId(
    //         TransactionId.generate(
    //             AccountId.fromSolidityAddress(DEPLOYMENT['Multisig'])
    //         )
    //     );

    // const HST = '0.0.968069';
    // const WHBAR_HST_REWARDER = '0.0.2130683';
    // tx = await new TransferTransaction()
    //     .addTokenTransfer(AccountId.fromSolidityAddress(DEPLOYMENT['WHBAR (HTS)']).toString(), AccountId.fromSolidityAddress(DEPLOYMENT['Multisig']), -33_000e8)
    //     .addTokenTransfer(AccountId.fromSolidityAddress(DEPLOYMENT['WHBAR (HTS)']).toString(), WHBAR_HST_REWARDER, 33_000e8)
    //     .addTokenTransfer(HST, AccountId.fromSolidityAddress(DEPLOYMENT['Multisig']), -526_290e8)
    //     .addTokenTransfer(HST, WHBAR_HST_REWARDER, 526_290e8)
    //     .setTransactionId(
    //         TransactionId.generate(
    //             AccountId.fromSolidityAddress(DEPLOYMENT['Multisig'])
    //         )
    //     );

    ///////////////
    // Add Farms //
    ///////////////

    // pid 3
    // tx = await new ContractExecuteTransaction()
    //     .setContractId(AccountId.fromSolidityAddress(DEPLOYMENT['PangoChef']).toString())
    //     .setFunction('initializePool',
    //         new ContractFunctionParameters()
    //             .addAddress('0x00000000000000000000000000000000001a8a06') // tokenOrRecipient USDC[hts]-WHBAR
    //             .addAddress('0xe34c472180a1252e2b837f82e48b6a19e6f29ffa') // pairContract
    //             .addUint8(1) // poolType
    //     )
    //     .setGas(1_000_000);

    // pid 7
    // tx = await new ContractExecuteTransaction()
    //     .setContractId(AccountId.fromSolidityAddress(DEPLOYMENT['PangoChef']).toString())
    //     .setFunction('initializePool',
    //         new ContractFunctionParameters()
    //             .addAddress('0x00000000000000000000000000000000001a94c0') // tokenOrRecipient HBARX-WHBAR
    //             .addAddress('0x471330d0b64e68418799db0fb9e3038f1d779011') // pairContract
    //             .addUint8(1) // poolType
    //     )
    //     .setGas(1_000_000);

    // pid 0
    // tx = await new ContractExecuteTransaction()
    //     .setContractId(AccountId.fromSolidityAddress(DEPLOYMENT['PangoChef']).toString())
    //     .setFunction('initializePool',
    //         new ContractFunctionParameters()
    //             .addAddress('0x00000000000000000000000000000000001a88cc') // tokenOrRecipient HBAR-PBAR
    //             .addAddress('0x7cf5854c73e0ae210143d65c8a5b52f47668c092') // pairContract
    //             .addUint8(1) // poolType
    //     )
    //     .setGas(1_000_000);

    // pid 5
    // tx = await new ContractExecuteTransaction()
    //     .setContractId(AccountId.fromSolidityAddress(DEPLOYMENT['PangoChef']).toString())
    //     .setFunction('initializePool',
    //         new ContractFunctionParameters()
    //             .addAddress('0x00000000000000000000000000000000001a94ce') // tokenOrRecipient USDC[hts]-PBAR
    //             .addAddress('0x6be7327e59eb80c3e282b423a5203070dc1cb745') // pairContract
    //             .addUint8(1) // poolType
    //     )
    //     .setGas(1_000_000);

    // pid 4
    // tx = await new ContractExecuteTransaction()
    //     .setContractId(AccountId.fromSolidityAddress(DEPLOYMENT['PangoChef']).toString())
    //     .setFunction('initializePool',
    //         new ContractFunctionParameters()
    //             .addAddress('0x00000000000000000000000000000000001a94c3') // tokenOrRecipient USDC[hts]-USDT[hts]
    //             .addAddress('0x7b9449c33b6adf82fa24202572271a32ede9e0ca') // pairContract
    //             .addUint8(1) // poolType
    //     )
    //     .setGas(1_000_000);

    ///////////////////
    // Add Rewarders //
    ///////////////////

    // tx = await new ContractExecuteTransaction()
    //     .setContractId(AccountId.fromSolidityAddress(DEPLOYMENT['PangoChef']).toString())
    //     .setFunction('setRewarder',
    //         new ContractFunctionParameters()
    //             .addUint256(14) // poolId (HBAR-USDC[hts])
    //             .addAddress('0x0000000000000000000000000000000000204067') // rewarder (1.29373916)
    //     )
    //     .setTransactionId(
    //         TransactionId.generate(
    //             AccountId.fromSolidityAddress(DEPLOYMENT['Multisig'])
    //         )
    //     )
    //     .setGas(250_000)

    /////////////////
    // Set Weights //
    /////////////////

    // tx = await new ContractExecuteTransaction()
    //     .setContractId(AccountId.fromSolidityAddress(DEPLOYMENT['PangoChef']).toString())
    //     .setFunction('setWeights',
    //         new ContractFunctionParameters()
    //             .addUint256Array([
    //                 14, 15, 16, 17, 18, 19,
    //                 3, 7, 0, 5, 4,
    //             ]) // poolIds
    //             .addUint32Array( [
    //                 0, 0, 0, 0, 0, 0,
    //                 2300, 1000, 3500, 700, 400,
    //             ]) // weights
    //     )
    //     .setGas(1_000_000);


    // tx = await new ContractExecuteTransaction()
    //     .setContractId('0.0.2116470')
    //     .setFunction('adminWithdraw',
    //         new ContractFunctionParameters()
    //             .addUint256Array([0,1])
    //     )
    //     .setTransactionId(
    //         TransactionId.generate(
    //             AccountId.fromSolidityAddress(DEPLOYMENT['Multisig'])
    //         )
    //     )
    //     .setGas(100_000);

    // tx = await new ContractExecuteTransaction()
    //     .setContractId(AccountId.fromSolidityAddress(DEPLOYMENT['PangolinStakingPositions']).toString())
    //     .setFunction('setRentInTinyBars',
    //         new ContractFunctionParameters()
    //             .addInt64('0')
    //     )
    //     .setTransactionId(
    //         TransactionId.generate(
    //             AccountId.fromSolidityAddress(DEPLOYMENT['Multisig'])
    //         )
    //     )
    //     .setGas(100_000);

    // Governance
    // const queuePendingAdmin_bytes = new ContractFunctionParameters().addAddress('0x0000000000000000000000000000000000e2907f')._build();
    // const queuePendingAdmin_eta = Math.ceil(Date.now() / 1000) + (86_400 * 2) + 60;
    // console.log(`queuePendingAdmin_eta: ${queuePendingAdmin_eta}`);

//     tx = await new ContractExecuteTransaction()
//         .setContractId(AccountId.fromSolidityAddress(DEPLOYMENT['Governor']).toString())
//         .setFunction('propose',
//             new ContractFunctionParameters()
//                 .addAddressArray([DEPLOYMENT['Timelock']]) // targets
//                 .addUint256Array([0]) // values
//                 .addStringArray(['setPendingAdmin(address)']) // signatures
//                 .addBytesArray([queuePendingAdmin_bytes]) // datas
//                 .addString(
// `# Implement GovernorPango
//
// ## What does this do?
//
// By voting on this proposal, you wish to transition control from Governor to GovernorPango.
// This contract lives at 0.0.14848127 and has similar mechanics as the current Governor but
// allows changing the proposal threshold via governance vote.`
//                 ) // descriptions
//                 .addInt64(3)
//         )
//         .setTransactionId(
//             TransactionId.generate(
//                 AccountId.fromSolidityAddress(DEPLOYMENT['Multisig'])
//             )
//         )
//         .setGas(1_000_000);

    // tx = await new ContractExecuteTransaction()
    //     .setContractId(AccountId.fromSolidityAddress(DEPLOYMENT['Governor']).toString())
    //     .setFunction('castVote',
    //         new ContractFunctionParameters()
    //             .addUint64(4) // proposalId
    //             .addBool(true) // support
    //             .addInt64(3) // nftId
    //     )
    //     .setTransactionId(
    //         TransactionId.generate(
    //             AccountId.fromSolidityAddress(DEPLOYMENT['Multisig'])
    //         )
    //     )
    //     .setGas(250_000);

    // tx = await new ContractExecuteTransaction()
    //     .setContractId(AccountId.fromSolidityAddress(DEPLOYMENT['GovernorPango']).toString())
    //     .setFunction('__acceptAdmin')
    //     .setGas(50_000);

    // tx = await new ContractExecuteTransaction()
    //     .setContractId(AccountId.fromSolidityAddress('0x000000000000000000000000000000000040b233').toString())
    //     .setFunction('executeTransaction',
    //         new ContractFunctionParameters()
    //             .addAddress(DEPLOYMENT['Timelock']) // target
    //             .addUint256(0) // value
    //             .addString('setPendingAdmin(address)') // signature
    //             .addBytes(new ContractFunctionParameters().addAddress(DEPLOYMENT['Governor'])._build()) // data
    //             .addUint256(1684610022) // eta
    //     )
    //     .setGas(500_000);



    // const sig0 = myPrivateKey.signTransaction(tx);
    // console.log(sig0);

    // tx = tx
    //     .setNodeAccountIds([AccountId.fromString('0.0.3')])
    //     .freezeWith(client)
    // tx
    //     .addSignature(myPrivateKey.publicKey, myPrivateKey.signTransaction(tx));

    // tx
    //     .addSignature(
    //         myPrivateKey.publicKey,
    //         sig0,
    //     )
    //     .addSignature(
    //         PublicKey.fromString('0x5b225bde70cc33d261f49dd9061694e67bf5c3f92d409adfa1a0f40527dc14c9'),
    //         Uint8Array.from([
    //             128, 214,  83, 163,  84, 180, 247,  15, 190, 131, 151,
    //             7, 163,  58,  55, 178,  58,  94,  75, 164,  24, 245,
    //             85, 231,  60,  30, 102,  82, 148, 167, 205,  76, 195,
    //             0,  64, 242,  18,  33, 124, 212,  59, 127,  81, 186,
    //             82,   8,  28, 142,  13, 171, 193, 229, 177, 140, 234,
    //             185, 105, 138, 234, 154, 173,  55, 232,   5
    //         ]),
    //     );

    // Scheduled
    // const executedTx = await new ScheduleCreateTransaction()
    //     .setScheduledTransaction(tx)
    //     .setPayerAccountId(AccountId.fromSolidityAddress(DEPLOYMENT['Multisig']))
    //     .execute(client);
    // Immediate
    const executedTx = await tx
        .setTransactionId(TransactionId.generate(AccountId.fromSolidityAddress(DEPLOYMENT['Multisig'])))
        .execute(client);

    const txId = executedTx.transactionId.toString();
    console.log(txId);

    await executedTx.getReceipt(client);
})()
    .catch(async (e) => {
        console.error(e);
        record = await tx.getRecord(client);
        console.log(record.errorMessage);
    })
    .finally(process.exit);
