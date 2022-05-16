import logging
import requests

from tweepy import Client, API

from src.classes.types import FarmData
from src.utils.utils import get_pools
from src.top_stable_farms.stable_tokens import STABLE_PAIRS
from src.top_stable_farms.image import create_image

logger = logging.getLogger()

GENERATE_IMAGE = True


def get_top_farms() -> list[FarmData]:
    pools_addr = get_pools()
    farms = []
    for pair in STABLE_PAIRS:
        pid = pools_addr.index(pair.address)
        response = requests.get(
            f"https://api.pangolin.exchange/pangolin/apr2/{pid}")
        data = response.json()
        farms.append({
            "pair": pair,
            "volumeUSD": 0,
            "pid": pid,
            "APR": data["combinedApr"],
            "TVL": 0,
            "rewards": []
        })

    farms.sort(key=lambda farm: farm["APR"], reverse=True)
    return farms


def main(client: Client, api: API, user: dict[str, any]) -> None:
    farms = get_top_farms()
    farms = farms[:3]

    text = f"Top {len(farms)} stable coins farms on @pangolindex by APR.\n"
    for farm in farms:
        text += f'{farm["pair"].name_for_tweet} {farm["APR"]}%\n'
    text += "\n🔗 https://app.pangolin.exchange/#/beta/pool"
    text += "\n#Pangolindex #Avalanche"

    tweet_params = {
        "text": text,
        "user_auth": True
    }

    if GENERATE_IMAGE:
        img = create_image(farms)
        media = api.media_upload('image.png', file=img)
        tweet_params["media_ids"] = [media.media_id_string]

    response = client.create_tweet(**tweet_params)
    tweet_data = response.data
    print(f"New top {len(farms)} stable farms tweet: \nhttps://twitter.com/{user['username']}/status/{tweet_data['id']}")
    logger.info(f"New top {len(farms)} stable farms tweet: https://twitter.com/{user['username']}/status/{tweet_data['id']}")
