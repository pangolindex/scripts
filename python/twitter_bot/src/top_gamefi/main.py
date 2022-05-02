import logging

from tweepy import API, Client

from src.top_gamefi.gamefi_tokens import GAMEFI_TOKENS
from src.top_gamefi.image import create_image
from src.utils.utils import human_format, get_tokens_24h_volume
from src.top_gamefi.variations import get_last_variation, set_last_variation, VARIATIONS

GENERATE_IMAGE = True

PERIOD = 3*24*60*60  # 3 days

logger = logging.getLogger()


def main(client: Client, api: API, user: dict[str, any]) -> None:
    variation_number = get_last_variation()
    variation = VARIATIONS[variation_number]
    tokensData = get_tokens_24h_volume(GAMEFI_TOKENS) # top 10 gamefi tokens
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
    logger.info(f"New top {len(tokensData)} gamefi tokens: https://twitter.com/{user['username']}/status/{tweet_data['id']}")
    set_last_variation(variation_number+1)
