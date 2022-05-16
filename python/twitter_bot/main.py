import logging
import os
import time
import schedule as sch
import sys

from configparser import RawConfigParser
from traceback import format_exc

from src.utils.client import create_client

from src.top_farms.main import main as top_farms
from src.top_farms.variations import (
    TOP_5_SUPER_FARMS,
    TOP_5_FARMS,
    TOP_10_FARMS_TVL,
    # TOP_10_FARMS_VOLUME,
    TOP_10_SUPER_FARMS_TVL,
    TOP_10_SUPER_FARMS_VOLUME,
)
from src.top_gamefi.main import main as top_gamefi
from src.top_tokens.main import main as top_tokens
from src.top_pairs.main import main as top_pairs
from src.top_stable_farms.main import main as top_stable_farms

if not os.path.exists("config_bot.ini"):
    print("Please copy the config_bot_example.ini to config_bot.ini and add your Twitter api keys!")
    sys.exit(0)

config = RawConfigParser(allow_no_value=True)
config.read("config_bot.ini")

log_level = config["Log"]["level"]
name = config["Log"]["name"]

PATH_ABS = os.path.abspath('.')
filename = f'{os.path.join(PATH_ABS, name)}.log'

logger = logging.getLogger()
logger.setLevel(log_level)
handler = logging.FileHandler(
    filename=filename, 
    encoding='utf-8', 
    mode='w',
)
handler.setLevel(log_level)
handler.setFormatter(logging.Formatter('%(asctime)s:%(levelname)s:%(name)s: %(message)s'))
logger.addHandler(handler) 

def main() -> None:
    client, api, user, = create_client(config)

    print(f"Twitter bot connected with @{user['username']}")
    schedule = sch.Scheduler()

    schedule.every().monday.at("00:00").do(top_farms, client, api, user, TOP_5_SUPER_FARMS) # monday: top 5 super farms by apr
    schedule.every().tuesday.at("00:00").do(top_tokens, client, api, user) # tuesday: top 10 tokens by volume 24h
    schedule.every().wednesday.at("00:00").do(top_pairs, client, api, user) # wednesday: top 10 pairs by volume 24h
    schedule.every().wednesday.at("12:00").do(top_farms, client, api, user, TOP_10_SUPER_FARMS_TVL) # wednesday at 12:00: top 10 super farms by tvl
    schedule.every().thursday.at("00:00").do(top_stable_farms, client, api, user) # thursday at 00:00 top 10 stable farms by apr
    schedule.every().thursday.at("12:00").do(top_farms, client, api, user, TOP_5_FARMS) # thursday at 12:00: top 5 farms by apr
    schedule.every().friday.at("00:00").do(top_farms, client, api, user, TOP_10_FARMS_TVL) # friday: top 10 farms by tvl
    schedule.every().saturday.at("00:00").do(top_gamefi, client, api, user) # saturday: top 5 / 10 gamefi by volume 24h
    schedule.every().sunday.at("00:00").do(top_farms, client, api, user, TOP_10_SUPER_FARMS_VOLUME) # sunday: top 10 super farms by volume

    while True:
        try:
            schedule.run_pending()
            time.sleep(1)
        except KeyboardInterrupt:
            print("Canceling all tasks")
            schedule.clear()
            print("Exiting...")
            break
        except Exception as e:
            logger.error(str(e))
            logger.error(format_exc())
            break

if __name__ == "__main__":
    main()