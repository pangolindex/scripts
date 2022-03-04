import configparser, csv, os

from datetime import datetime
from web3 import Web3
from web3.middleware import geth_poa_middleware
from typing import Dict, List

from src.database import Database

def main():
    # Load config
    config = configparser.ConfigParser()
    config.read('config.ini')

    # MongoDB connection string
    connection_string = config["Mongodb"]["connection_string"]
    # Database class
    database = Database(connection_string)

    path = os.path.abspath(".")
    if not os.path.exists('csv'):
        os.mkdir('csv')
    path = os.path.join(path, 'csv')

    # Get date
    w3 = Web3(Web3.HTTPProvider("https://api.avax.network/ext/bc/C/rpc"))
    w3.middleware_onion.inject(geth_poa_middleware, layer=0)

    start_block = int(config["GetHolders"]["start_block"])
    staking_start_block = int(config["GetHolders"]["staking_start_block"])
    last_block = int(config["GetHolders"]["last_block"])
    block = w3.eth.get_block(start_block)
    block_staking = w3.eth.get_block(staking_start_block)
    block_last = w3.eth.get_block(last_block)
    
    date = datetime.utcfromtimestamp(block.timestamp)    
    date_staking = datetime.utcfromtimestamp(block_staking.timestamp)    
    date_last = datetime.fromtimestamp(block_last.timestamp)   

    total_days = abs((date_last-date).days)
    total_days_staking = abs((date_last-date_staking).days)

    print(f"total of days PNG and LP: {total_days}")
    print(f"total of days staking contracts: {total_days_staking}")

    with open(os.path.join(path, "total.csv"), 'w', encoding='UTF8') as f:    
        # Create the csv writer
        writer = csv.writer(f)
        # Write header
        writer.writerow(["category", "total"])

        rows = [
            ["png", database.total_png()],
            ["lp", database.total_lp()],
            ["staking", database.total_staking()],
        ]

        # Write a rows to the csv file
        writer.writerows(rows)

    categories = [
        {
            "file": "png_holders.csv",
            "results": database.fetch_all_png_holder(),
            "days": total_days,
        },
        {
            "file": "lp_pngavax.csv",
            "results": database.fetch_all_lp_pngavax(),
            "days": total_days,
        },
        {
            "file": "staking.csv",
            "results": database.fetch_all_staking(),
            "days": total_days_staking,
        },
    ]
    
    def format_to_csv(value: Dict[str, any], category: Dict[str, any]) -> List[any]:
        if(category['days'] == 0):
            day_average = 0
        else: 
            day_average = value["amount"]/category['days']
         
        return [value["_id"], value["amount"], day_average]
    
    for category in categories:
        file = category["file"]
        # Open the file in the write mode
        with open(os.path.join(path, file), 'w', encoding='UTF8') as f:    
            # Create the csv writer
            writer = csv.writer(f)

            # Write header
            writer.writerow(['address', 'total amount', 'day average'])
            results = category["results"]
            rows = []
            if results:
                rows = [format_to_csv(result, category) for result in results]
            # Write a row to the csv file
            writer.writerows(rows)

if __name__ == "__main__":
    main()
