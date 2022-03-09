import json, os

from threading import Thread
from web3 import Web3
from web3.middleware import geth_poa_middleware

PATH_ABS = os.path.dirname(os.path.realpath('__file__'))

if os.environ.get('CONF_PATH') is None:
    CONF_PATH = "../../config"
else:
    CONF_PATH = os.environ.get('CONF_PATH')

PATH_ABI = os.path.join(PATH_ABS , CONF_PATH)

with open(os.path.join(PATH_ABI, "abi.json")) as file:
    ABIS = json.load(file)

with open(os.path.join(PATH_ABI, "address.json")) as file:
    ADDRESSES = json.load(file)
    
FACTORY_ABI = ABIS["FACTORY"]
PNG_LP_ABI = ABIS["PAIR"]

FACTORY = ADDRESSES["PANGOLIN_FACTORY"]
TOKEN = ADDRESSES["PNG"]

ACTIVE_WORKERS = 40

def main():
    w3 = Web3(Web3.HTTPProvider("https://api.avax.network/ext/bc/C/rpc"))
    # inject the poa compatibility middleware to the innermost layer
    #https://web3py.readthedocs.io/en/stable/middleware.html#geth-style-proof-of-authority
    w3.middleware_onion.inject(geth_poa_middleware, layer=0)

    factory_contract = w3.eth.contract(FACTORY, abi=FACTORY_ABI)

    pairLength: int = factory_contract.functions.allPairsLength().call()

    class Worker(Thread):
        def __init__(self, number: int, total: int) -> None:
            Thread.__init__(self)
            self.number = number
            self.total = total

            self.token0 = None
            self.token1 = None
            self.pairAddress = None
            self.factory_contract = w3.eth.contract(FACTORY, abi=FACTORY_ABI)

        def run(self) -> None:
            print(f"Pair {self.number}/{self.total}°")
            self.pair_address = self.factory_contract.functions.allPairs(self.number).call()
            pair_contract = w3.eth.contract(self.pair_address , abi=PNG_LP_ABI)
            self.token0 = pair_contract.functions.token0().call()
            self.token1 = pair_contract.functions.token1().call()

    workers = []
    interators = pairLength//ACTIVE_WORKERS
    if pairLength % ACTIVE_WORKERS != 0:
        interators += 1

    number = 0
    for _ in range(interators):
        active_workers = []
        for _ in range(ACTIVE_WORKERS):
            if number == pairLength:
                break

            worker = Worker(number, pairLength)
            worker.start()
            workers.append(worker)
            active_workers.append(worker)
            number += 1

        for worker in active_workers:   
            worker.join()

    token_pools=[]
    for worker in workers:
        if TOKEN in [worker.token0, worker.token1]:
            token_pools.append(worker.pair_address)

    with open(os.path.join(PATH_ABS, "pools.json"), 'w') as file:
        file.write(json.dumps(token_pools, indent=4))
    
if __name__ == "__main__":
    main()