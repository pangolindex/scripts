import csv
import os

from decimal import Decimal
from datetime import datetime
from configparser import RawConfigParser
from web3 import Web3, HTTPProvider
from web3.middleware import geth_poa_middleware
import math
from src.airdrop import AIRDROP_CATEGORIES, get_config_from_file
from src.database.database import Database

def total_categories(database: Database, path: str, airdrop_id: str, categories: list[str]) -> dict[str, Decimal]:
    """This function will calculate the total amount for each category

    Args:
        database (Database): database class
        path (str): path to save the csv file
        airdrop_id (str): airdrop id to get in the database
        categories (list[str]): list of categories to get in the database
    """
    with open(os.path.join(path, "total.csv"), 'w') as f:
        writer = csv.writer(f)
        
        total = {}
        for category in categories:
            _total = Decimal(database.total_amount_category(category, airdrop_id))
            total[category] = _total if category.lower() != 'lp' else _total*Decimal(2)
            writer.writerow([category, total[category]])
            
        writer.writerow(["Total", sum(total.values())])
        return total


def get_block_date(block_number: int, w3: Web3) -> datetime:
    """Return the date of a block

    Args:
        block_number (int): block number
        w3 (Web3): web3 class

    Returns:
        datetime: date of the block in datetime format
    """
    block = w3.eth.get_block(block_number)
    return datetime.utcfromtimestamp(block.timestamp)

def create_category_csv(database: Database, path: str, category: str, days: Decimal, unit: str) -> None:
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
        writer.writerow(["Days", days])
        writer.writerow(['address', 'total amount', 'day average total amount'])

        results = database.category_address_sum(category)
        
        def format_to_csv(value: dict[str, any]) -> list[str | float]:
            amount = Decimal(Web3.fromWei(value["amount"], unit))
            day_average = 0 if (days == 0) else amount/days
            return [value["_id"], amount, day_average]

        if results:
            rows = [format_to_csv(result) for result in results]
            # Write a row to the csv file
            writer.writerows(rows)

def export(config: dict[str, any]) -> None:
    # Load config
    config_parser = RawConfigParser()
    config_parser.read('config.ini')

    # MongoDB connection string
    connection_string = os.environ.get("CONNECTION_STRING")
    if connection_string is None:
        connection_string = config_parser["Mongodb"]["connection_string"]

    # Load png supply and percentage from config
    PNG_SUPPLY = Decimal(Web3.toWei(config["png_supply"], "ether"))
    PERCENTAGE = Decimal(config["percentage"])/Decimal(100)
    AIRDROP_AMOUNT = PNG_SUPPLY*PERCENTAGE

    # Database class
    database = Database(connection_string)

    # Path to save the csv files
    path = os.path.abspath(".")
    if not os.path.exists('csv'):
        os.mkdir('csv')
    path = os.path.join(path, 'csv')

    w3 = Web3(HTTPProvider(config["blockchain"]["rpc"]))
    w3.middleware_onion.inject(geth_poa_middleware, layer=0)

    # Get only categories that are in config
    selected_categories = [
        category for category in AIRDROP_CATEGORIES 
        if category in config
    ]
    
    # Get total amount for each category
    total = total_categories(database, path, config["id"], selected_categories)

    # Calculate the total of days for each category
    days: dict[str, Decimal] = {}
    for category in selected_categories:
        start_block = config[category]["start_block"]
        last_block = config[category]["last_block"]
        date = get_block_date(start_block, w3)
        date_last = get_block_date(last_block, w3)
        day = abs((date_last - date).days)
        print(f"Category: {category}, days: {day}")
        days[category] = Decimal(day)

    results = database.total_airdrop_result(config['id'], selected_categories)

    for category in selected_categories:
        create_category_csv(database, path, category, days[category], config["unit"])
    
    total_with_day_avg = sum(total[category]/days[category] for category in selected_categories)
    
    with open(os.path.join(path, "airdrops_results.csv"), 'w') as f:
        writer = csv.writer(f)
        writer.writerow(["Airdrop name", config["name"], "Airdrop id", config["id"]])
        for category in selected_categories:
            writer.writerow([f"Days {category}", days[category]])

        # write csv title
        writer.writerow(["address", *selected_categories, "total amount", "day average total amount", "allocated amount"])
        total_alocated = Decimal(0)
        for result in results:
            row = [result["_id"]]
            total_avg = Decimal(0)
            total = Decimal(0)
            for category in selected_categories:
                amount = Decimal(Web3.fromWei(result[category], config["unit"]))
                total += amount # total amount for each category
                
                day_average = Decimal(0) if (days[category] == 0) else amount/days[category]
                if category.lower() == "lp":
                    day_average *= Decimal(2) # double the amount for lp holders
                total_avg += day_average # calculate the total of day average amount for each category
                row.append(amount)

            row.append(total)
            row.append(total_avg)
            # calculate the allocated amount to airdrop to the address
            allocated = math.trunc((total_avg/total_with_day_avg)*AIRDROP_AMOUNT)
            row.append(allocated)
            # Write a row to the csv file
            # Row: address, category1, category2, ..., total amount, day average total amount, allocated amount
            total_alocated += allocated
            writer.writerow(row)
        print(f"Total allocated: {total_alocated:.18f}")
    database.close()


if __name__ == "__main__":
    config_file = os.environ.get("AIRDROP_CONF") # get config file from env variable
    config = get_config_from_file(config_file)
    export(config)
