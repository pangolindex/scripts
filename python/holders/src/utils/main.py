from functools import cache
from queue import Queue
from web3 import Web3

def create_queue(start_block: int, last_block: int, interval: int) -> Queue():
    q = Queue()
    for i in range(start_block, last_block, interval):
        q.put(i)
    return q

@cache
def is_contract(w3: Web3, address: str) -> bool:
    code = w3.eth.get_code(address)
    return len(code) > 0
