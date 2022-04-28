import logging

from datetime import datetime
from tweepy import API, Client

from src.utils.graph import Graph
from src.utils.block import get_block_by_timestamp
from src.top_gamefi.type import TokenData
from src.top_gamefi.gamefi_tokens import GAMEFI_TOKENS
from src.top_gamefi.image import create_image
from src.utils.utils import human_format
from src.top_gamefi.variations import get_last_variation, set_last_variation, VARIATIONS

GENERATE_IMAGE = True

PERIOD = 3*24*60*60  # 3 days

logger = logging.getLogger()


def get_top_tokens(number: int) -> list[TokenData]:
    # get timestamp from 1 day ago
    timestamp_one_day_back = int(datetime.now().timestamp())-86400

    block = get_block_by_timestamp(timestamp_one_day_back)
    template = '''
        last_token_{0}: tokens(
            where: {{id: "{0}"}},
        ){{
            tradeVolumeUSD
        }}
        token_{0}: tokens(
            where: {{id: "{0}"}},
            block: {{number: {1}}}
        ){{
            tradeVolumeUSD
        }}
    '''

    query = "{"
    for token in GAMEFI_TOKENS:
        query += template.format(token.address.lower(), block)
    query += "}"

    graph = Graph(
        "https://api.thegraph.com/subgraphs/name/pangolindex/exchange")

    result = graph.query(query)

    tokensData: list[TokenData] = []
    for token in GAMEFI_TOKENS:
        total_volume = float(
            result[f"last_token_{token.address.lower()}"][0]["tradeVolumeUSD"])
        one_day_back_volume = float(
            result[f"token_{token.address.lower()}"][0]["tradeVolumeUSD"])
        volume = total_volume - one_day_back_volume
        tokensData.append({
            "token": token,
            "volumeUSD": volume
        })

    tokensData.sort(key=lambda x: x["volumeUSD"], reverse=True)

    return tokensData[:number]


def main(client: Client, api: API, user: dict[str, any]) -> None:
    variation_number = get_last_variation()
    variation = VARIATIONS[variation_number]
    tokensData = get_top_tokens(variation.number_tokens)

    text = f"Top {len(tokensData)} GameFI tokens on @pangolindex by volume (24 hours)."

    for i, data in enumerate(tokensData):
        token = data["token"]
        text += f"\n{i+1}- ${token.symbol}"
        if len(tokensData) == 5:
            text += f"💵 {human_format(data['volumeUSD'])}$"

    text += "\n🔗 https://app.pangolin.exchange/#/beta/swap"
    text += "\n#Pangolindex #Avalanche"

    tweet_params = {
        "text": text,
        "user_auth": True
    }

    if GENERATE_IMAGE:
        img = create_image(tokensData)
        media = api.media_upload('image.png', file=img)
        tweet_params["media_ids"] = [media.media_id_string]

    response = client.create_tweet(**tweet_params)
    tweet_data = response.data
    print(f"New top {len(tokensData)} gamefi tokens: \nhttps://twitter.com/{user['username']}/status/{tweet_data['id']}")
    logger.info(f"New top {len(tokensData)} agamefi tokens: https://twitter.com/{user['username']}/status/{tweet_data['id']}")
    set_last_variation(variation_number+1)
