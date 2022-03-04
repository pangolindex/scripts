import configparser, json, os

from web3 import Web3
from web3.middleware import geth_poa_middleware

from src.block import Block
from src.constants.main import (
    PNG,
    LP_PNG_AVAX,
    STAKING_AVAX,
    STAKING_OOE,
    STAKING_APEIN,
)
from src.database import Database
from src.workers import Worker_PNG, Worker_LP, Worker_STAKING

PATH_ABS = os.path.dirname(os.path.realpath('__file__'))
PATH_ABI = os.path.join(PATH_ABS , "../../config")

with open(os.path.join(PATH_ABI, "abi.json")) as file:
    ABIS = json.load(file)

PNG_ABI = ABIS['PNG']
LP_PNGAVAX_ABI = ABIS['PAIR']
STAKING_ABI = ABIS['STAKING_REWARDS']

def main() -> None:
    """This script get all PNG transfers, Mint/Burn LP PNG/AVAX and Staking (AVAX, OOE, APEIN) and save in mongodb

    Args:
        connection_string (str): string connection for mongodb cloud
    """

    # Load config
    config = configparser.ConfigParser()
    config.read('config.ini')

    # Number of thread of each category
    NO_WORKERS_PNG = int(config["GetHolders"]["no_workers_png"])
    NO_WORKERS_LP = int(config["GetHolders"]["no_workers_lp"])
    NO_WORKERS_STAKING = int(config["GetHolders"]["no_workers_staking"])

    # Number of range to query
    RANGE_BLOCKS = int(config["GetHolders"]["range_blocks"])

    start_block = int(config["GetHolders"]["start_block"])
    last_block = int(config["GetHolders"]["last_block"])
    staking_start_block = int(config["GetHolders"]["staking_start_block"])

    #MongoDB connection string
    connection_string = config["Mongodb"]["connection_string"]

    w3 = Web3(Web3.HTTPProvider("https://api.avax.network/ext/bc/C/rpc"))
    # inject the poa compatibility middleware to the innermost layer
    #https://web3py.readthedocs.io/en/stable/middleware.html#geth-style-proof-of-authority
    w3.middleware_onion.inject(geth_poa_middleware, layer=0)

    # It informs which block should be made to query for the thread, it looks like a pointer that is read by all threads
    png_block = Block(start_block, last_block)
    lp_block = Block(start_block, last_block)
    staking_block = Block(staking_start_block, last_block)

    #Database class
    database = Database(connection_string)

    # Contracts 
    png_contract = w3.eth.contract(PNG, abi=PNG_ABI)

    lp_pngavax_contract = w3.eth.contract(LP_PNG_AVAX, abi=LP_PNGAVAX_ABI)

    staking_cotract_avax = w3.eth.contract(STAKING_AVAX, abi=STAKING_ABI)
    staking_cotract_ooe = w3.eth.contract(STAKING_OOE, abi=STAKING_ABI)
    staking_cotract_apein = w3.eth.contract(STAKING_APEIN, abi=STAKING_ABI)

    #Create Threads to get all transfers of PNG and start
    workers_png = []
    for _ in range(NO_WORKERS_PNG):
        start = png_block.actual_block
        worker = Worker_PNG(
            start,
            RANGE_BLOCKS,
            png_block,
            database,
            png_contract,
        )
        png_block.actual_block += RANGE_BLOCKS
        workers_png.append(worker)
    for worker in workers_png:
        worker.start()

    #Create Threads to get all PNG holders and start
    workers_lp = []
    for _ in range(NO_WORKERS_LP):
        start = lp_block.actual_block
        worker = Worker_LP(
            start,
            RANGE_BLOCKS,
            lp_block,
            database,
            lp_pngavax_contract,
            w3
        )
        lp_block.actual_block += RANGE_BLOCKS
        workers_lp.append(worker)
    for worker in workers_lp:
        worker.start()

    workers_staking = []
    for _ in range(NO_WORKERS_STAKING):
        start = staking_block.actual_block
        worker = Worker_STAKING(
            start,
            RANGE_BLOCKS,
            staking_block,
            database,
            staking_cotract_avax,
            staking_cotract_ooe,
            staking_cotract_apein,
        )
        staking_block.actual_block += RANGE_BLOCKS
        workers_staking.append(worker)
    for worker in workers_staking:
        worker.start()

    # Join workers to wait till they finished
    for worker in workers_png:
        worker.join()
    for worker in workers_lp:
        worker.join() 
    for worker in workers_staking:
        worker.join() 

    found_tx_png = sum(worker.count_tx_png_holders for worker in workers_png)
    print(f"Found {found_tx_png} png holders transactions")

    found_tx_lp = sum(worker.count_tx_png_holders for worker in workers_png)
    print(f"Found {found_tx_lp} LP PNG/AVAX transactions")

    found_tx_staking = sum(worker.count_tx_png_holders for worker in workers_png)
    print(f"Found {found_tx_staking} staking transactions")

if __name__ == "__main__":
    main()
