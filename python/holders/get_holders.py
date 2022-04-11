import importlib
import os

from configparser import RawConfigParser
from queue import Queue
from web3 import Web3, HTTPProvider
from web3.middleware import geth_poa_middleware

from src.constants.main import AIRDROP_CATEGORIES
from src.airdrop import get_config_from_file
from src.database.database import Database
from src.ui import create_app, create_category_body, vertical_line
from src.categories.worker import BaseWoker

INTERVAL_BLOCKS = 10000

def get_holders(config: dict[str, any]) -> None:
    """This script get all PNG transfers, Mint/Burn LP PNG/AVAX and Staking (AVAX, OOE, APEIN) and save in mongodb
    Args:
        config (dict[str, any]): json with config of airdrop
    """

    # Load config
    config_parser = RawConfigParser()
    config_parser.read('config.ini')

    # MongoDB connection string
    connection_string = os.environ.get("CONNECTION_STRING")
    if connection_string is None:
        connection_string = config_parser["Mongodb"]["connection_string"]

    # Database class
    database = Database(connection_string)

    w3 = Web3(HTTPProvider(config["blockchain"]["rpc"]))
    w3.middleware_onion.inject(geth_poa_middleware, layer=0)

    categories_body = []
    workers: list[BaseWoker] = []
    for i, category in enumerate(AIRDROP_CATEGORIES):
        if category not in config:
            continue  # Skip categories that are not in config

        start_block = config[category]["start_block"]
        last_block = config[category]["last_block"]

        body, progressbar, label, textarea = create_category_body(category, last_block)
        if i == 0:
            categories_body.append(body)
        else:
            categories_body.extend([vertical_line, body])

        module = importlib.import_module(f"src.categories.{category}")
        num_workers = config_parser.getint("Config", f"threads_{category}")

        q = Queue()
        for i in range(start_block, last_block, INTERVAL_BLOCKS):
            q.put(i)

        address = config[category]["address"]
        if isinstance(address, list):
            contract = [
                w3.eth.contract(addr, abi=module.CONTRACT_ABI)
                for addr in address
            ]
        else:
            contract = w3.eth.contract(address, abi=module.CONTRACT_ABI)

        for _ in range(num_workers):
            worker = module.Worker(
                category = category,
                airdrop_id = config["id"],
                queue = q,
                interval = INTERVAL_BLOCKS,
                last_block = last_block,
                contract = contract,
                database=database,
                progressbar = progressbar,
                textarea = textarea,
                label = label,
                web3 = w3
            )
            workers.append(worker)

    app = create_app(categories_body, workers)

    for worker in workers:
        worker.start()
        worker.app = app
        worker.workers = workers

    app.run(in_thread=True)
    for worker in workers:
        worker.join()
    
    database.close()
    os.system('cls' if os.name == 'nt' else 'clear')
    print("Done")

if __name__ == "__main__":
    config_file = os.environ.get("AIRDROP_CONF")
    config = get_config_from_file(config_file)
    get_holders(config)
