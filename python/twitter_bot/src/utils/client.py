import logging
import webbrowser

from configparser import RawConfigParser
from tweepy import API, Client, OAuth1UserHandler

logger = logging.getLogger()

def create_client(config: RawConfigParser) -> tuple[Client, API, dict[str, any]]:
    try:
        bearer_token = config["Twitter"]["BEARER_TOKEN"]
        consumer_key = config["Twitter"]["CONSUMER_KEY"]
        consumer_secret = config["Twitter"]["CONSUMER_SECRET"]
        access_token = config["Twitter"]["ACCESS_TOKEN"]
        access_token_secret = config["Twitter"]["ACCESS_TOKEN_SECRET"]
        client = Client(
            #bearer_token = bearer_token,
            consumer_key = consumer_key,
            consumer_secret = consumer_secret,
            access_token = access_token,
            access_token_secret = access_token_secret
        )
        auth = OAuth1UserHandler(
            consumer_key = consumer_key,
            consumer_secret = consumer_secret,
            access_token = access_token,
            access_token_secret = access_token_secret
        )
        api = API(auth)
    except Exception as e:
        logger.error("Error creating API", exc_info=True)
        raise e from e

    response = client.get_me(user_auth=True)
    user = response.data

    logger.info(f"Client created, connected with @{user['username']}")
    return client, api, user
