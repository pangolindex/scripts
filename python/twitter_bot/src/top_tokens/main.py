import logging

from datetime import datetime
from tweepy import API, Client

from src.classes.token import Token
from src.top_tokens.image import create_image
from src.utils.graph import Graph
from src.utils.utils import get_tokens_24h_volume, human_format

logger = logging.getLogger()

GENERATE_IMAGE = True

PERIOD = 3*24*60*60  # 3 days

def get_tokens() -> list[Token]:
    # get timestamp from 1 day ago
    timestamp_one_day_back = int(datetime.now().timestamp())-86400
    
    graph = Graph(
        "https://api.thegraph.com/subgraphs/name/pangolindex/exchange"
    )

    query = f"""{{
        tokenDayDatas(
            first: 50,
            where: {{date_gte: {timestamp_one_day_back}}}
            orderBy: dailyVolumeUSD, orderDirection: desc){{
            token{{
                id
                name
                symbol
            }}
        }}
    }}
    """

    result = graph.query(query)

    tokens = list(map(lambda token: Token(token["token"]["id"], token["token"]["name"], token["token"]["symbol"]), result["tokenDayDatas"]))
    return tokens


def main(client: Client, api: API, user: dict[str, any]) -> None:
    tokens = get_tokens()
    top_tokens = get_tokens_24h_volume(tokens)
    top_tokens = top_tokens[:10]

    text = f"Top {len(top_tokens)} tokens on @pangolindex by volume (24 hours)."

    for i, data in enumerate(top_tokens):
        token = data["token"]
        text += f"\n{i+1}- ${token.symbol}"
        if len(top_tokens) == 5:
            text += f"💵 {human_format(data['volumeUSD'])}$"

    text += "\n🔗 https://app.pangolin.exchange/#/beta/swap"
    text += "\n#Pangolindex #Avalanche"

    tweet_params = {
        "text": text,
        "user_auth": True
    }

    if GENERATE_IMAGE:
        img = create_image(top_tokens)
        media = api.media_upload('image.png', file=img)
        tweet_params["media_ids"] = [media.media_id_string]

    response = client.create_tweet(**tweet_params)
    tweet_data = response.data
    print(f"New top {len(top_tokens)} tokens: \nhttps://twitter.com/{user['username']}/status/{tweet_data['id']}")
    logger.info(f"New top {len(top_tokens)} tokens: https://twitter.com/{user['username']}/status/{tweet_data['id']}")
