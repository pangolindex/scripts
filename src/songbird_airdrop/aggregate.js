const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://sgb.ftso.com.au/ext/bc/C/rpc'));
const blacklist = require('./blacklist');
const holding = require('./output/holding_0x3AAD4eE30d41525c2Ee7D0F4070ebF31568F31b4.json');
const lping = require('./output/lping_0x0f6e8806ddD77bB0d753d8b0D820c62Df16344aE.json');
const farming = require('./output/farming_0x482FC8A1d418e3C4BC73C0E7fE0fA62eAB0df8dc-0.json');
const staking = require('./output/staking_0xcf46391024803368eA169c5F5cE6eDa622Cb577c.json');
const LOCALE = { maximumFractionDigits: 0 };


const AGGREGATE = {};
const table = [];

const MULTIPLIER_DIVIDEND = 1_00;
const MULTIPLIERS = {
  holding: 1_50,
  staking: 1_50,
  lping: 3_00,
  farming: 3_00,
};
const PSB_TO_SBG_MULTIPLIER = 2_30;

(async () => {
  const holdingAggBase = {};
  const holdingAggMult = {};
  for (const {owner, amount} of holding) {
    const amountBase = web3.utils.toBN(amount);
    const amountAdj = amountBase.muln(MULTIPLIERS.holding).divn(MULTIPLIER_DIVIDEND);
    holdingAggBase[owner] = amountBase;
    holdingAggMult[owner] = amountAdj;
    if (AGGREGATE[owner]) {
      AGGREGATE[owner].base = AGGREGATE[owner].base.add(amountBase);
      AGGREGATE[owner].mult = AGGREGATE[owner].mult.add(amountAdj);
    } else {
      AGGREGATE[owner] = {
        base: amountBase,
        mult: amountAdj,
      };
    }
  }
  table.push({
    category: 'Holding',
    base: (blacklistAndSum(holdingAggBase) / (10 ** 18)).toLocaleString(undefined, LOCALE),
    multiplied: (blacklistAndSum(holdingAggMult) / (10 ** 18)).toLocaleString(undefined, LOCALE),
    multiplier: MULTIPLIERS.holding / MULTIPLIER_DIVIDEND,
  });

  const stakingAggBase = {};
  const stakingAggMult = {};
  for (const {owner, amount} of staking) {
    const amountBase = web3.utils.toBN(amount);
    const amountAdj = amountBase.muln(MULTIPLIERS.staking).divn(MULTIPLIER_DIVIDEND);
    stakingAggBase[owner] = amountBase;
    stakingAggMult[owner] = amountAdj;
    if (AGGREGATE[owner]) {
      AGGREGATE[owner].base = AGGREGATE[owner].base.add(amountBase);
      AGGREGATE[owner].mult = AGGREGATE[owner].mult.add(amountAdj);
    } else {
      AGGREGATE[owner] = {
        base: amountBase,
        mult: amountAdj,
      };
    }
  }
  table.push({
    category: 'Staking',
    base: (blacklistAndSum(stakingAggBase) / (10 ** 18)).toLocaleString(undefined, LOCALE),
    multiplied: (blacklistAndSum(stakingAggMult) / (10 ** 18)).toLocaleString(undefined, LOCALE),
    multiplier: MULTIPLIERS.staking / MULTIPLIER_DIVIDEND,
  });

  const lpingAggBase = {};
  const lpingAggMult = {};
  for (const {owner, token1} of lping) {
    const amountBase = web3.utils.toBN(token1);
    const amountAdj = amountBase.muln(MULTIPLIERS.lping).divn(MULTIPLIER_DIVIDEND);
    lpingAggBase[owner] = amountBase;
    lpingAggMult[owner] = amountAdj;
    if (AGGREGATE[owner]) {
      AGGREGATE[owner].base = AGGREGATE[owner].base.add(amountBase);
      AGGREGATE[owner].mult = AGGREGATE[owner].mult.add(amountAdj);
    } else {
      AGGREGATE[owner] = {
        base: amountBase,
        mult: amountAdj,
      };
    }
  }
  table.push({
    category: 'LPing',
    base: (blacklistAndSum(lpingAggBase) / (10 ** 18)).toLocaleString(undefined, LOCALE),
    multiplied: (blacklistAndSum(lpingAggMult) / (10 ** 18)).toLocaleString(undefined, LOCALE),
    multiplier: MULTIPLIERS.lping / MULTIPLIER_DIVIDEND,
  });

  const farmingAggBase = {};
  const farmingAggMult = {};
  for (const {owner, token1} of farming) {
    const amountBase = web3.utils.toBN(token1);
    const amountAdj = amountBase.muln(MULTIPLIERS.farming).divn(MULTIPLIER_DIVIDEND);
    farmingAggBase[owner] = amountBase;
    farmingAggMult[owner] = amountAdj;
    if (AGGREGATE[owner]) {
      AGGREGATE[owner].base = AGGREGATE[owner].base.add(amountBase);
      AGGREGATE[owner].mult = AGGREGATE[owner].mult.add(amountAdj);
    } else {
      AGGREGATE[owner] = {
        base: amountBase,
        mult: amountAdj,
      };
    }
  }
  table.push({
    category: 'Farming',
    base: (blacklistAndSum(farmingAggBase) / (10 ** 18)).toLocaleString(undefined, LOCALE),
    multiplied: (blacklistAndSum(farmingAggMult) / (10 ** 18)).toLocaleString(undefined, LOCALE),
    multiplier: MULTIPLIERS.farming / MULTIPLIER_DIVIDEND,
  });

  table.push({});

  const totalBasePSB = Object.entries(AGGREGATE).filter(blacklistFilter).reduce((sum, [owner, {base, mult}]) => sum.add(base), web3.utils.toBN(0));
  const totalMultPSB = Object.entries(AGGREGATE).filter(blacklistFilter).reduce((sum, [owner, {base, mult}]) => sum.add(mult), web3.utils.toBN(0));
  table.push({
    category: 'Total PSB',
    base: (totalBasePSB / (10 ** 18)).toLocaleString(undefined, LOCALE),
    multiplied: (totalMultPSB / (10 ** 18)).toLocaleString(undefined, LOCALE),
  });

  const totalBaseSGB = totalBasePSB.muln(PSB_TO_SBG_MULTIPLIER).divn(MULTIPLIER_DIVIDEND);
  const totalMultSGB = totalMultPSB.muln(PSB_TO_SBG_MULTIPLIER).divn(MULTIPLIER_DIVIDEND);
  table.push({
    category: 'Total SGB',
    base: (totalBaseSGB / (10 ** 18)).toLocaleString(undefined, LOCALE),
    multiplied: (totalMultSGB / (10 ** 18)).toLocaleString(undefined, LOCALE),
  });

  console.table(table);

  // let i = 0;
  // const sortedAggregates = Object.entries(AGGREGATE)
  //   .sort((a, b) => a[1].base.lt(b[1].base) ? 1 : -1);
  // console.log(`Checking addresses for contracts ...`);
  // const contracts = [];
  // let baseSum = web3.utils.toBN(0);
  // for (const [recipient, {base, mult}] of sortedAggregates) {
  //   console.log(`${++i}/${sortedAggregates.length}`);
  //   const isEOA = await web3.eth.getCode(recipient) === '0x';
  //   if (!isEOA) {
  //     contracts.push(recipient);
  //     baseSum = baseSum.add(base);
  //     console.log(`Recipient ${recipient} (${base.toString() / (10 ** 18)} base) is not EOA`);
  //   }
  // }
  // console.log(contracts);
  // console.log(`Found ${contracts.length} contracts worth ${baseSum.toString() / (10 ** 18)} base`);

  const airdropDataPSB = Object.entries(AGGREGATE)
    .map(([address, data]) => ({address, amount: data.mult}))
    .sort((a, b) => a.amount.lt(b.amount) ? 1 : -1)
    .map(({address, amount}) => ({address, amount: amount.toString()}));
  const airdropDataSGB = Object.entries(AGGREGATE)
    .map(([address, data]) => ({address, amount: data.mult.muln(PSB_TO_SBG_MULTIPLIER).divn(MULTIPLIER_DIVIDEND)}))
    .sort((a, b) => a.amount.lt(b.amount) ? 1 : -1)
    .map(({address, amount}) => ({address, amount: amount.toString()}));
  fs.writeFileSync(path.join(__dirname, 'output', `airdrop_PSB.json`), JSON.stringify(airdropDataPSB));
  fs.writeFileSync(path.join(__dirname, 'output', `airdrop_SGB.json`), JSON.stringify(airdropDataSGB));
})()
  .catch(console.error);

function blacklistFilter([owner]) {
  return !blacklist.includes(owner);
}

function blacklistAndSum(obj) {
  return Object.entries(obj).filter(blacklistFilter).reduce((sum, [owner, amount]) => sum.add(amount), web3.utils.toBN(0));
}