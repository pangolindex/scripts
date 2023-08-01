const { TokenId, AccountId, ContractId } = require("@hashgraph/sdk");

/**
 * This function check if the string is valid account id, 0.0.0000...
 * @param {string | undefined} hederaId  Address to check
 * @returns {string | false}
 */
function isHederaIdValid(hederaId) {
  if (
    hederaId &&
    hederaId
      .toLowerCase()
      .match(
        /^(0|(?:[1-9]\d*))\.(0|(?:[1-9]\d*))\.(0|(?:[1-9]\d*))(?:-([a-z]{5}))?$/g
      )
  ) {
    return hederaId;
  } else {
    return false;
  }
}

/**
 * This function convert a string to TokenId instance
 * @param {string} tokenAddress Token address
 * @returns {TokenId}
 */
function toTokenId(tokenAddress) {
  return this.isHederaIdValid(tokenAddress)
    ? TokenId.fromString(tokenAddress)
    : TokenId.fromSolidityAddress(tokenAddress);
}

/**
 * This function convert a string to AccountId instance
 * @param {string} address
 * @returns {AccountId}
 */
function toAccountId(address) {
  return this.isHederaIdValid(address)
    ? AccountId.fromString(address)
    : AccountId.fromSolidityAddress(address);
}

/**
 * This function convert a string to ContractId instance
 * @param {string} address
 * @returns {ContractId}
 */
function toContractId(address) {
  return this.isHederaIdValid(address)
    ? ContractId.fromString(address)
    : ContractId.fromSolidityAddress(address);
}

/**
 * This function convert a token id to contract id
 * @param {string} id
 * @returns {string}
 */
function tokenToContractId(id) {
  const lastIndex = id.lastIndexOf(".");

  let before = "";
  let after = "";

  if (lastIndex !== -1) {
    before = id.slice(0, lastIndex);
    after = id.slice(lastIndex + 1);
    after = (Number(after) - 1).toString();
  }

  const contractId = before + "." + after;

  return contractId;
}

/**
 * This function convert a token evm address to contract evm address
 * @param {string} address
 * @returns {string}
 */
function tokenAddressToContractAddress(address) {
  const contractId = tokenToContractId(
    TokenId.fromSolidityAddress(address).toString()
  );
  return ContractId.fromString(contractId).toSolidityAddress();
}

/**
 * This function convert a contract id to token id
 * @param {string} id
 * @returns {string}
 */
function contractToTokenId(id) {
  const lastIndex = id.lastIndexOf(".");

  let before = "";
  let after = "";

  if (lastIndex !== -1) {
    before = id.slice(0, lastIndex);
    after = id.slice(lastIndex + 1);
    after = (Number(after) + 1).toString();
  }

  const tokenId = before + "." + after;

  return tokenId;
}

/**
 * This function convert a contract evm address to token evm address
 * @param {string} address
 * @returns {string}
 */
function contractAddressToTokenAddress(address) {
  const contractId = contractToTokenId(
    ContractId.fromSolidityAddress(address).toString()
  );
  return TokenId.fromString(contractId).toSolidityAddress();
}

module.exports = {
  isHederaIdValid,
  toTokenId,
  toAccountId,
  toContractId,
  tokenToContractId,
  tokenAddressToContractAddress,
  contractToTokenId,
  contractAddressToTokenAddress,
};
