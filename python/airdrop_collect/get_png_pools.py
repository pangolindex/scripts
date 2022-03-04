import json, os

from web3 import Web3
from web3.middleware import geth_poa_middleware

from src.constants.main import FACTORY, PNG

PATH_SRC = os.path.join(os.path.abspath("."), "src")
PATH_CONST = os.path.join(PATH_SRC, "constants")
PATH_ABI = os.path.join(PATH_CONST, "ABI")

with open(os.path.join(PATH_ABI, "FACTORY.json")) as file:
    FACTORY_ABI = json.load(file)

with open(os.path.join(PATH_ABI, "PNG_LP.json")) as file:
    PNG_LP_ABI = json.load(file)

def main():
    w3 = Web3(Web3.HTTPProvider("https://api.avax.network/ext/bc/C/rpc"))
    # inject the poa compatibility middleware to the innermost layer
    #https://web3py.readthedocs.io/en/stable/middleware.html#geth-style-proof-of-authority
    w3.middleware_onion.inject(geth_poa_middleware, layer=0)

    factory_contract = w3.eth.contract(FACTORY, abi=FACTORY_ABI)

    pairLength: int = factory_contract.functions.allPairsLength().call()

    png_pools = []
    for i in range(pairLength):
        pair_address = factory_contract.functions.allPairs(i).call()
        pair_contract = w3.eth.contract(pair_address, abi=PNG_LP_ABI)
        token0 = pair_contract.functions.token0().call()
        token1 = pair_contract.functions.token1().call()
        if PNG in [token0, token1]:
            png_pools.append(pair_address)

    with open(os.path.join(PATH_CONST, "pools.json"), 'w') as file:
        file.write(json.dumps(png_pools, indent=4))
    
if __name__ == "__main__":
    main()