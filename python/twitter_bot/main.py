import logging, os

from configparser import RawConfigParser
from tweepy import API, OAuthHandler

from src.utils.client import create_client
from src.utils.background_worker import BackgroundWorker

from src.top_aprs.main import PERIOD as top_aprs_period, main as top_aprs

config = RawConfigParser(allow_no_value=True)
config.read("config.ini")

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
        top_apr_task = BackgroundWorker(top_aprs_period, top_aprs, client, api, user) 
        tasks.append(top_apr_task)
    except KeyboardInterrupt:
        print("Canceling all tasks")
        stop_tasks(tasks)
        print("Exiting...")
    except Exception as e:
        logger.error(str(e))

if __name__ == "__main__":
    main()