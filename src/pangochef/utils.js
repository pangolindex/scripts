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
 * @prop {number} pid
 * @prop {number} poolType
 * @prop {string} recipient
 * @prop {string} rewarder
 * @prop {Token | undefined} token0
 * @prop {Token | undefined} token1
 * @prop {number} weight
 */

/**
 * This function get a
 * @param {ChainId} chainId
 */
async function getfarms(chainId) {
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

  const fetchFn = async (poolInfo) => {
    if (parseInt(poolInfo.poolType) === 1) {
      let pairAddress = poolInfo.tokenOrRecipient;

      // For hedera we can fetch the token address because this don't have the function token0 and token1
      // we need to convert the token address to token id, sub 1 to get contract id and convert to contract adress
      if (chain.network_type === NetworkType.HEDERA) {
        pairAddress = tokenAddressToContractAddress(poolInfo.tokenOrRecipient);
      }

      const result = await Helpers.getPairTokensCached(pairAddress);
      return result;
    }
    return [undefined, undefined];
  };

  const tokensAddresses = await Helpers.promiseAllChunked(
    poolInfos,
    fetchFn,
    30,
    null,
    30
  );

  const tokens = await Helpers.getTokensCached(
    tokensAddresses.flat().filter((address) => !!address),
    chainId
  );

  /** @type {Farm[]}*/
  const farms = [];
  for (let index = 0; index < poolIds.length; index++) {
    const pid = poolIds[index][0];
    const poolInfo = poolInfos[index];
    const poolRewardInfo = poolRewardInfos[index];
    const token0Address = tokensAddresses[index][0];
    const token0 = token0Address ? tokens[token0Address] : undefined;
    const token1Address = tokensAddresses[index][1];
    const token1 = token1Address ? tokens[token1Address] : undefined;

    farms.push({
      pid: pid,
      poolType: parseInt(poolInfo.poolType),
      recipient: poolInfo.tokenOrRecipient,
      rewarder: poolInfo.rewarder,
      token0: token0,
      token1: token1,
      weight: parseInt(poolRewardInfo.weight),
    });
  }
  return farms;
}

module.exports = {
  getfarms,
};
