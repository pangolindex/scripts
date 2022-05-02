import logging

from datetime import datetime
from tweepy import API, Client

from src.classes.pair import Pair
from src.classes.token import Token
from src.top_pairs.image import create_image
from src.utils.graph import Graph
from src.utils.utils import get_pairs_24h_volume, human_format

logger = logging.getLogger()

GENERATE_IMAGE = True

PERIOD = 6*24*60*60  # 6 days

def get_pairs() -> list[Pair]:
    # get timestamp from 1 day ago
    timestamp_one_day_back = int(datetime.now().timestamp())-86400

    graph = Graph(
        "https://api.thegraph.com/subgraphs/name/pangolindex/exchange"
    )

    query = f"""{{
        pairDayDatas(
            first: 50,
            where: {{date_gte: {timestamp_one_day_back}}}
            orderBy: dailyVolumeUSD, orderDirection: desc){{
            pairAddress
            token0{{
                id
                name
                symbol
            }}
            token1{{
                id
                name
                symbol
            }}
        }}
    }}
    """

    result = graph.query(query)

    def create_pair(pair_data):
        token0 = Token(
            pair_data["token0"]["id"],
            pair_data["token0"]["name"],
            pair_data["token0"]["symbol"]
        )
        token1 = Token(
            pair_data["token1"]["id"],
            pair_data["token1"]["name"],
            pair_data["token1"]["symbol"]
        )

        return Pair(pair_data["pairAddress"], token0, token1)

    pairs = list(map(lambda pair: create_pair(pair), result["pairDayDatas"]))
    return pairs


def main(client: Client, api: API, user: dict[str, any]) -> None:
    pairs = get_pairs()
    top_pairs = get_pairs_24h_volume(pairs)
    top_pairs = top_pairs[:10]

    text = f"Top {len(top_pairs)} pairs on @pangolindex by volume (24 hours)."

    for i, data in enumerate(top_pairs):
        pair = data["pair"]
        text += f"\n{i+1}- {pair.name_for_tweet}"
        if len(top_pairs) == 5:
            text += f"💵 {human_format(data['volumeUSD'])}$"

    text += "\n🔗 https://app.pangolin.exchange/#/beta/pool"
    text += "\n#Pangolindex #Avalanche"

    tweet_params = {
        "text": text,
        "user_auth": True
    }

    if GENERATE_IMAGE:
        img = create_image(top_pairs)
        media = api.media_upload('image.png', file=img)
        tweet_params["media_ids"] = [media.media_id_string]

    response = client.create_tweet(**tweet_params)
    tweet_data = response.data
    print(f"New top {len(top_pairs)} pairs: \nhttps://twitter.com/{user['username']}/status/{tweet_data['id']}")
    logger.info(f"New top {len(top_pairs)} pairs: https://twitter.com/{user['username']}/status/{tweet_data['id']}")
