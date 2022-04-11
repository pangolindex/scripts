import csv
import os

from datetime import datetime
from configparser import RawConfigParser
from web3 import Web3, HTTPProvider
from web3.middleware import geth_poa_middleware

from src.airdrop import AIRDROP_CATEGORIES, get_config_from_file
from src.database.database import Database

def total(database: Database, path: str, config: dict[str, any]) -> None:
    """This function will calculate the total amount for each category

    Args:
        database (Database): database class
        path (str): path to csv file
    """
    with open(os.path.join(path, "total.csv"), 'w') as f:
        # Create the csv writer
        writer = csv.writer(f)
        # Write header
        writer.writerow(["category", "total"])

        rows = []
        for category in AIRDROP_CATEGORIES:
            if category not in config:
                continue  # Skip categories that are not in config
            amount = Web3.fromWei(database.total_amount_category(category), config["unit"])
            rows.append([category, amount])
        # Write a row to the csv file
        writer.writerows(rows)

def get_block_date(block_number: int, w3: Web3) -> str:
    block = w3.eth.get_block(block_number)
    return datetime.utcfromtimestamp(block.timestamp)

def airdrop_results(path: str, config: dict[str, any], database: Database) -> None:
    with open(os.path.join(path, "airdrops_results.csv"), 'w') as f:
        writer = csv.writer(f)
        selected_categories = [category for category in AIRDROP_CATEGORIES if category in config]

        categories = [
            f"amount_from_{category}"
            for category in selected_categories
        ]
        header = ["airdrop_name", "airdrop_id", "address", "total_amount", *categories]
        writer.writerow(header)
        results = database.total_airdrop_result(config['id'], selected_categories)

        for result in results:
            amount = Web3.fromWei(result["total_amount"], config["unit"])
            row = [config["name"], config["id"], result["_id"], amount]
            row.extend(Web3.fromWei(result[category], config["unit"]) for category in selected_categories)
            writer.writerow(row)

def create_category_csv(database: Database, path: str, category: str, days: int, unit: str) -> None:
    """This function will create a csv file with the holders of a category

    Args:
        database (Database): database class
        path (str): path to csv file
        category (str): category
        days (int): total days
    """
    with open(os.path.join(path, f"{category}.csv"), 'w') as f:
        # Create the csv writer
        writer = csv.writer(f)
        # Write header
        writer.writerow(['address', 'total amount', 'day average'])

        results = database.category_address_sum(category)
        
        def format_to_csv(value: dict[str, any]) -> list[str | float]:
            amount = Web3.fromWei(value["amount"], unit)
            day_average = 0 if (days == 0) else amount/days
            return [value["_id"], amount, day_average]

        if results:
            rows = [format_to_csv(result) for result in results]
            # Write a row to the csv file
            writer.writerows(rows)

def export(config: dict[str, any]) -> None:
    # Load config
    config_parser = RawConfigParser()
    config_parser.read('airdrops/png_holders_1.ini')

    # MongoDB connection string
    connection_string = os.environ.get("CONNECTION_STRING")
    if connection_string is None:
        connection_string = config_parser["Mongodb"]["connection_string"]

    # Database class
    database = Database(connection_string)

    path = os.path.abspath(".")
    if not os.path.exists('csv'):
        os.mkdir('csv')
    path = os.path.join(path, 'csv')

    # Get date
    w3 = Web3(HTTPProvider(config["blockchain"]["rpc"]))
    w3.middleware_onion.inject(geth_poa_middleware, layer=0)

    total(database, path, config)

    for category in AIRDROP_CATEGORIES:
        if category not in config:
            continue  # Skip categories that are not in config

        start_block = config[category]["start_block"]
        last_block = config[category]["last_block"]
        date = get_block_date(start_block, w3)
        date_last = get_block_date(last_block, w3)
        total_days = abs((date_last-date).days)
        print(f"{category.capitalize()} total days: {total_days}")
        create_category_csv(database, path, category, total_days, config["unit"])

    airdrop_results(path, config, database)

    database.close()

if __name__ == "__main__":
    config_file = os.environ.get("AIRDROP_CONF")
    config = get_config_from_file(config_file)
    export(config)
