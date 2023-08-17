const { CHAINS, ChainId } = require("@pangolindex/sdk");
const Web3 = require("web3");
const abis = require("../../config/abi.json");
const {
  fetchSingleContractMultipleData,
  fetchMultipleContractSingleData,
} = require("../util/multicall");
const Helpers = require("../core/helpers");

/**
 * @typedef MinichefFarm
 * @type {object}
 * @prop {number} pid - Pool id
 * @prop {string} lpToken - Pgl token address
 * @prop {string} rewarder - This is for superfarms, so if address is different of 0x0...0 is the rewarder contract that give the extras rewards
 * @prop {Token | undefined} token0 - Token 0 from PGL
 * @prop {Token | undefined} token1 - Token 1 from PGL
 * @prop {number} weight - Weight of farm
 * @prop {Token[]} extraRewards - List of extra rewards tokens
 */

/**
 * This function get all minchef farms
 * @param {ChainId} chainId
 */
async function getFarms(chainId) {
  const chain = CHAINS[chainId];
  const web3 = new Web3(new Web3.providers.HttpProvider(chain.rpc_uri));

  const multicallContract = new web3.eth.Contract(
    abis.MULTICALL,
    chain.contracts?.multicall
  );

  const miniChefContract = new web3.eth.Contract(
    abis.MINICHEF_V2,
    chain.contracts?.mini_chef?.address
  );

  const [pairAddresses, poolRewardInfos] = await Promise.all([
    miniChefContract.methods.lpTokens().call(),
    miniChefContract.methods.poolInfos().call(),
  ]);

  const pids = pairAddresses.map((_, index) => [index]);

  const rewarders = await fetchSingleContractMultipleData(
    multicallContract,
    miniChefContract,
    "rewarder",
    pids,
  );

  const tokensAddresesMap = await Helpers.getPairsTokensCachedViaMulticall(
    pairAddresses,
    chainId
  );

  const tokens = await Helpers.getTokensCached(
    pairAddresses.flatMap((address) => [
      tokensAddresesMap.token0[address],
      tokensAddresesMap.token1[address],
    ]),
    chainId
  );

  const rewarderContracts = rewarders.map(
    (rewarder) =>
      new web3.eth.Contract(abis.REWARDER_VIA_MULTIPLIER, rewarder?.[0])
  );

  const extraRewardsAddresses = await fetchMultipleContractSingleData(
    multicallContract,
    rewarderContracts,
    "getRewardTokens"
  );

  const extraTokens = await Helpers.getTokensCached(
    extraRewardsAddresses
      .flat()
      .filter((address) => !!address)
      .flatMap((address) => address[0]),
    chainId
  );

  /** @type {MinichefFarm[]}*/
  const farms = [];
  for (let index = 0; index < pairAddresses.length; index++) {
    const pid = index;
    const lpToken = pairAddresses[index];
    const rewarder = rewarders[index][0];
    const weight = poolRewardInfos[index].allocPoint;

    const token0Address = tokensAddresesMap.token0[lpToken];
    const token0 = token0Address ? tokens[token0Address] : undefined;
    const token1Address = tokensAddresesMap.token1[lpToken];
    const token1 = token1Address ? tokens[token1Address] : undefined;

    const extraRewardsAddress = extraRewardsAddresses[index] ?? [[]];
    const poolExtraRewardTokens = extraRewardsAddress[0].map(
      (address) => extraTokens[address]
    );
    farms.push({
      pid: pid,
      lpToken: lpToken,
      rewarder: rewarder,
      token0: token0,
      token1: token1,
      weight: parseInt(weight),
      extraRewards: poolExtraRewardTokens,
    });
  }
  return farms;
}

/**
 * Show the farms friendly
 * @param {MinichefFarm[]} farms
 */
async function showFarmsFriendly(farms) {
  const totalAllocPoints = farms.reduce((sum, { weight }) => sum + weight, 0);

  console.table(
    farms.map((farm) => {
      farm.token0 = farm.token0?.symbol;
      farm.token1 = farm.token1?.symbol;
      farm.extraRewards = farm.extraRewards.map((token) => token?.symbol);
      return farm;
    })
  );
  console.log(`Total alloc points/weight: ${totalAllocPoints}`);
}

module.exports = {
  getFarms,
  showFarmsFriendly,
};
