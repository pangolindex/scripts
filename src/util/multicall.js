const Web3 = require("web3");
const abiDecoder = require("abi-decoder");

/**
 * This function decode bytecode result in readable value
 * @param {*} contract
 * @param {string} methodName
 * @param {string} bytecode
 * @returns
 */
function decodeBytecodeResult(contract, methodName, bytecode) {
  const abi = contract.methods[methodName](undefined)._method.outputs;
  const result = web3.eth.abi.decodeParameters(abi, bytecode);
  return result;
}

/**
 * This function decode bytecode in the function signature
 * @param {*} contract
 * @param {string} bytecode
 * @returns {{name: string, params: any[]}}
 */
function decodeFunction(contract, bytecode) {
  abiDecoder.addABI(contract._jsonInterface);
  const decoded = abiDecoder.decodeMethod(bytecode);
  return decoded;
}

/**
 * This function encode the function call in bytecode
 * @param {*} contract
 * @param {string} methodName
 * @param {any[]} params
 * @returns {string}
 */
function encodeFunction(contract, methodName, params) {
  const tx = contract.methods[methodName](...params);
  const bytecode = tx.encodeABI();
  return bytecode;
}

/**
 * This function fetch data from multicall
 * @param {Web3.conta} multicall
 * @param {{target: string, callData: string}[]} calls
 */
async function fetchMulticallData(multicall, calls) {
  return await multicall.methods.aggregate(calls).call();
}

/**
 * This function fetch multiple data from same contract
 * @param {*} multicallContract Multicall contract
 * @param {*} contract Contract to fetch
 * @param {string} methodName name of method to call
 * @param {any[][]} params 
 * @returns 
 */
async function fetchSingleContractMultipleData(
  multicallContract,
  contract,
  methodName,
  params
) {
  const calls = params.map((param) => ({
    target: contract._address,
    callData: encodeFunction(contract, methodName, param),
  }));;
  const { returnData } = await fetchMulticallData(multicallContract, calls);
  return returnData.map((result) =>
    decodeBytecodeResult(contract, methodName, result)
  );
}

/**
 * This function fetch same data from multiple contracts
 * @param {*} multicallContract Multicall contract
 * @param {any[]} contract Contract to fetch
 * @param {string} methodName Name of method to call
 * @param {any[]} params Params to use for all queries
 * @returns 
 */
async function fetchMultipleContractSingleData(
  multicallContract,
  contracts,
  methodName,
  params,
) {
  const calls = contracts.map((contract) => ({
    target: contract._address,
    callData: encodeFunction(contract, methodName, params),
  }));;
  const { returnData } = await fetchMulticallData(multicallContract, calls);
  return returnData.map((result, index) =>
    decodeBytecodeResult(contracts[index], methodName, result)
  );
}

/**
 * This function fetch multiple data from multiple contracts
 * @param {*} multicallContract Multicall contract
 * @param {any[]} contract Contract to fetch
 * @param {string} methodName Name of method to call
 * @param {any[][]} params Params to use for each query queries
 * @returns 
 */
async function fetchMultipleContractMutipleData(
  multicallContract,
  contracts,
  methodName,
  params,
) {
  const calls = contracts.map((contract, index) => ({
    target: contract._address,
    callData: encodeFunction(contract, methodName, params[index]),
  }));;
  const { returnData } = await fetchMulticallData(multicallContract, calls);
  return returnData.map((result, index) =>
    decodeBytecodeResult(contracts[index], methodName, result)
  );
}

module.exports = {
  fetchSingleContractMultipleData,
  fetchMultipleContractSingleData,
  fetchMultipleContractMutipleData,
  decodeBytecodeResult,
  decodeFunction,
  encodeFunction,
  fetchMulticallData,
};
