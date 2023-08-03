const { ChainId } = require("@pangolindex/sdk");

const axios = require("axios").default;

/**
 * This class handles how to request data from the hedera network
 */
class HederaFetcher {
  mirrorNode;

  /**
   * @constructor
   * @param {ChainId} chainId
   */
  constructor(chainId) {
    this.mirrorNode = axios.create({
      baseURL:
        chainId === ChainId.HEDERA_MAINNET
          ? "https://mainnet-public.mirrornode.hedera.com/"
          : "https://testnet.mirrornode.hedera.com/",
      timeout: 10000,
    });
  }

  /**
   * @typedef WalletInfo
   * @type {object}
   * @prop {number} hbarBalance
   * @prop {{token_id: string, balance: number}[]} tokens
   * @prop {string} transaction - Last transaction id
   */

  /**
   * This function get a info about an account
   * @param {string} address - Wallet address
   * @returns {WalletInfo | null}
   */
  async getWalletInfo(address) {
    try {
      const response = await this.mirrorNode.get(
        `/api/v1/accounts/${address}?limit=1&order=desc`
      );
      const data = response.data;
      return {
        hbarBalance: data.balance.balance,
        tokens: data.balance.tokens,
        transaction: data.transactions[0].transaction_id,
      };
    } catch {
      return null;
    }
  }

  /**
   * This function get the tokens associated an account
   * @param {string} address - Wallet address
   * @returns {string[]}
   */
  async getWalletTokens(address) {
    try {
      const response = await this.mirrorNode.get(
        `/api/v1/tokens?account.id=${address}&limit=100&order=desc&type=FUNGIBLE_COMMON`
      );
      const data = response.data;
      return data.tokens.map((token) => token.token_id);
    } catch {
      return [];
    }
  }
}

module.exports = {
  HederaFetcher,
};
