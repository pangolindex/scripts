const { CHAINS, ChainId, NetworkType, Token } = require("@pangolindex/sdk");
const Web3 = require("web3");
const abis = require("../../config/abi.json");
const {
  fetchSingleContractMultipleData,
  fetchMultipleContractSingleData,
} = require("../util/multicall");
const Helpers = require("../core/helpers");
const { tokenAddressToContractAddress } = require("../hedera/utils");

/**
 * @typedef Farm
 * @type {object}
 * @prop {number} pid - Pool id
 * @prop {number} poolType - Type of pool, 1 ERC20, 2 Relayer, 3 Unseted 
 * @prop {string} recipient - Pgl token address or the contract will receive the png
 * @prop {string} rewarder - This is for superfarms, so if address is different of 0x0...0 is the rewarder contract that give the extras rewards
 * @prop {Token | undefined} token0 - Token 0 from PGL
 * @prop {Token | undefined} token1 - Token 1 from PGL
 * @prop {number} weight - Weight of farm
 * @prop {Token[]} extraRewards - List of extra rewards tokens
 */

/**
 * This function get all pangocheft farms
 * @param {ChainId} chainId
 */
async function getFarms(chainId) {
  const chain = CHAINS[chainId];
  const web3 = new Web3(new Web3.providers.HttpProvider(chain.rpc_uri));

  const multicallContract = new web3.eth.Contract(
    abis.MULTICALL,
    chain.contracts?.multicall
  );

  const pangoChefContract = new web3.eth.Contract(
    abis.PANGO_CHEF,
    chain.contracts?.mini_chef?.address
  );

  const poolCount = parseInt(
    await pangoChefContract.methods.poolsLength().call()
  );

  const poolIds = new Array(poolCount).fill(0).map((_, index) => [index]);

  const [poolInfos, poolRewardInfos] = await Promise.all([
    fetchSingleContractMultipleData(
      multicallContract,
      pangoChefContract,
      "pools",
      poolIds
    ),
    fetchSingleContractMultipleData(
      multicallContract,
      pangoChefContract,
      "poolRewardInfos",
      poolIds
    ),
  ]);

  const pairAddresses = poolInfos.map((pool) => {
    if (parseInt(pool.poolType) === 2) return null;

    return chain.network_type === NetworkType.HEDERA
      ? tokenAddressToContractAddress(pool.tokenOrRecipient)
      : pool.tokenOrRecipient;
  });

  const tokensAddresesMap = await Helpers.getPairsTokensCachedViaMulticall(
    pairAddresses.filter((address) => !!address),
    chainId
  );

  const tokens = await Helpers.getTokensCached(
    pairAddresses
      .filter((address) => !!address)
      .flatMap((address) => [
        tokensAddresesMap.token0[address],
        tokensAddresesMap.token1[address],
      ]),
    chainId
  );

  const rewarderContracts = poolInfos.map(
    (poolInfo) =>
      new web3.eth.Contract(abis.REWARDER_VIA_MULTIPLIER, poolInfo.rewarder)
  );

  const extraRewardsAddresses = await fetchMultipleContractSingleData(
    multicallContract, rewarderContracts, "getRewardTokens"
  );

  const extraTokens = await Helpers.getTokensCached(
    extraRewardsAddresses.flat().filter(address => !!address).flatMap(address => address[0]), chainId
  );

  /** @type {Farm[]}*/
  const farms = [];
  for (let index = 0; index < poolIds.length; index++) {
    const pid = poolIds[index][0];
    const poolInfo = poolInfos[index];
    const poolRewardInfo = poolRewardInfos[index];
    const pairAddress = pairAddresses[index];
    const token0Address = tokensAddresesMap.token0[pairAddress];
    const token0 = token0Address ? tokens[token0Address] : undefined;
    const token1Address = tokensAddresesMap.token1[pairAddress];
    const token1 = token1Address ? tokens[token1Address] : undefined;
    const extraRewardsAddress = extraRewardsAddresses[index] ?? [[]];
    const poolExtraRewardTokens = extraRewardsAddress[0].map(address => extraTokens[address]);
    farms.push({
      pid: pid,
      poolType: parseInt(poolInfo.poolType),
      recipient: poolInfo.tokenOrRecipient,
      rewarder: poolInfo.rewarder,
      token0: token0,
      token1: token1,
      weight: parseInt(poolRewardInfo.weight),
      extraRewards: poolExtraRewardTokens,
    });
  }
  return farms;
}

/**
 * Show the farms friendly
 * @param {Farm[]} farms
 */
async function showFarmsFriendly(farms) {
  const totalAllocPoints = farms.reduce((sum, { weight }) => sum + weight, 0);

  console.table(
    farms.map((farm) => {
      farm.poolType =
        farm.poolType === 1
          ? "ERC20 Pool"
          : farm.poolType === 2
          ? "Relayer Pool"
          : "Unset Pool";

      farm.token0 = farm.token0?.symbol;
      farm.token1 = farm.token1?.symbol;
      farm.extraRewards = farm.extraRewards.map(token => token?.symbol)
      return farm;
    })
  );
  console.log(`Total alloc points/weight: ${totalAllocPoints}`);
}

module.exports = {
  getFarms,
  showFarmsFriendly,
};
