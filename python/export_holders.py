import configparser, csv, os

from src.database import Database

def main():
    # Load config
    config = configparser.ConfigParser()
    config.read('config.ini')

    #MongoDB connection string
    connection_string = config["Mongodb"]["connection_string"]
    #Database class
    database = Database(connection_string)

    path = os.path.abspath(".")

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

    def format_to_csv(value):
        return [value["_id"], value["amount"], value["amount"]/295]

    categories = [
        {
            "file": "png_holders.csv",
            "results": database.fetch_all_png_holder(),
        },
        {
            "file": "lp_pngavax.csv",
            "results": database.fetch_all_lp_pngavax(),
        },
        {
            "file": "staking.csv",
            "results": database.fetch_all_staking(),
        },
    ]
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
                rows = list(map(format_to_csv, results))

            # Write a row to the csv file
            writer.writerows(rows)

if __name__ == "__main__":
    main()
