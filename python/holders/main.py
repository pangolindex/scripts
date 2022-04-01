import sys
import os

from InquirerPy import inquirer

from get_holders import get_holders
from src.airdrop import create_airdrop_config, get_config_from_file

def main():
    try:
        load_config = inquirer.confirm(
            message="Load airdrop config from file?",
            default=True,
        ).execute()

        if load_config:
            airdrop_config = get_config_from_file()
        else:
            airdrop_config = create_airdrop_config()
    except KeyboardInterrupt:
        print("Exiting ...")
        sys.exit(0)

    os.system('cls' if os.name == 'nt' else 'clear')
    get_holders(airdrop_config)

if __name__ == "__main__":
    main()
