import logging

from datetime import datetime
from tweepy import API, Client

from src.utils.graph import Graph
from src.utils.block import get_block_by_timestamp
from src.classes.types import TokenData
from src.top_gamefi.gamefi_tokens import GAMEFI_TOKENS
from src.top_gamefi.image import create_image
from src.utils.utils import human_format, get_24h_volume
from src.top_gamefi.variations import get_last_variation, set_last_variation, VARIATIONS

GENERATE_IMAGE = True

PERIOD = 3*24*60*60  # 3 days

logger = logging.getLogger()


def main(client: Client, api: API, user: dict[str, any]) -> None:
    variation_number = get_last_variation()
    variation = VARIATIONS[variation_number]
    tokensData = get_24h_volume(GAMEFI_TOKENS)
    tokensData = tokensData[:variation.number_tokens]

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
