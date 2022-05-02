import logging, os, sys

from configparser import RawConfigParser
from traceback import format_exc

from src.utils.client import create_client
from src.utils.background_worker import BackgroundWorker

from src.top_farms.main import PERIOD as top_farms_period, main as top_farms
from src.top_gamefi.main import PERIOD as top_gamefi_period, main as top_gamefi
from src.top_tokens.main import PERIOD as top_tokens_period, main as top_tokens
from src.top_pairs.main import PERIOD as top_pairs_period, main as top_pairs

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

def stop_tasks(tasks: list[BackgroundWorker]) -> None:
    for task in tasks:
        task.stop()

def main() -> None:
    client, api, user, = create_client(config)
    
    print(f"Twitter bot connected with @{user['username']}")
    tasks = []
    try:
        top_farms_task = BackgroundWorker(top_farms_period, top_farms, client, api, user) 
        tasks.append(top_farms_task)
        top_gamefi_task = BackgroundWorker(top_gamefi_period, top_gamefi, client, api, user) 
        tasks.append(top_gamefi_task)
        top_tokens_task = BackgroundWorker(top_tokens_period, top_tokens, client, api, user)
        tasks.append(top_tokens_task)
        top_pairs_task = BackgroundWorker(top_pairs_period, top_pairs, client, api, user)
        tasks.append(top_pairs_task)
    except KeyboardInterrupt:
        print("Canceling all tasks")
        stop_tasks(tasks)
        print("Exiting...")
    except Exception as e:
        logger.error(str(e))
        logger.error(format_exc())

if __name__ == "__main__":
    main()