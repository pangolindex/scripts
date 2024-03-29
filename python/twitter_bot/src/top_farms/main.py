import logging

from queue import Queue
from tweepy import API, Client

from src.classes.pair import Pair
from src.classes.token import Token
from src.classes.types import APRData, FarmData
from src.constants.blacklist import BLACKLIST
from src.constants.config import ABIS
from src.constants.tokens import PNG
from src.top_farms.image import create_image
from src.top_farms.variations import Variation
from src.top_farms.get_apr_worker import Worker
from src.utils.graph import Graph
from src.utils.utils import get_pools, MINICHEF, w3

logger = logging.getLogger()

# Number of workers to work concurrent to get apr
WORKERS = 40
# Time period to tweet, in seconds
# Generate image to add in tweet
GENERATE_IMAGE = True

def get_aprs(pools: list[str]) -> list[APRData]:    
    queue = Queue(len(pools))
    for i in range(len(pools)):
        queue.put(i)

    workers = []
    for _ in range(WORKERS):
        worker = Worker(queue)
        worker.start()
        workers.append(worker)

    for worker in workers:
        worker.join()

    r = []

    for worker in workers:
        r.extend(worker.results)

    return r

def get_pool_info(
    pools: list[str], 
    farms: list[APRData], 
    variation: Variation
) -> list[FarmData]:
    graph = Graph("https://api.thegraph.com/subgraphs/name/pangolindex/exchange")

    template = '''
        pool_{0}: pair(id: "{0}"){{
            token0{{
                symbol
                id
                name
            }}
            token1{{
                symbol
                id
                name
            }}
            reserveUSD
            volumeUSD
        }}
    '''

    query_str = "{"
    for farm in farms:
        address = pools[farm['pid']]
        query_str += template.format(address.lower())
    query_str += "}"

    results = graph.query(query_str)

    pools_info: list[FarmData] = []
    for farm in farms:
        pid = farm['pid']
        address = pools[pid]
        result = results[f"pool_{address.lower()}"]
        rewarder = MINICHEF.functions.rewarder(pid).call()
        rewards = [PNG]
        if rewarder != "0x0000000000000000000000000000000000000000":
            rewarder_contract = w3.eth.contract(rewarder, abi=ABIS["REWARDER_VIA_MULTIPLIER"])
            reward_tokens = rewarder_contract.functions.getRewardTokens().call()
            reward_tokens = list(map(lambda x: Token(address=x), reward_tokens))
            rewards.extend(reward_tokens)

        token0 = Token(
            name = result["token0"]["name"],
            symbol = result["token0"]["symbol"], 
            address = result["token0"]["id"],
        )
        token1 = Token(
            name = result["token1"]["name"],
            symbol = result["token1"]["symbol"],
            address = result["token1"]["id"],
        )

        pair = Pair(address, token0, token1)

        pool_info: FarmData = {
            'pair': pair,
            'pid': pid,
            'APR': farm['apr']['combinedApr'],
            "TVL": float(result["reserveUSD"]),
            "volumeUSD": float(result["volumeUSD"]),
            'rewards': rewards,
        }

        pools_info.append(pool_info)
        
    pools_info.sort(key=lambda x: x[variation.order_by], reverse=True)

    if variation.only_super_farms:
        pools_info = list(filter(lambda x: len(x['rewards']) > 1, pools_info))
    elif variation.only_farms:
        pools_info = list(filter(lambda x: len(x['rewards']) == 1, pools_info))

    # Remove farms with blacklisted tokens
    pools_info = list(
        filter(
            lambda pool: pool["pair"].token0 not in BLACKLIST and pool["pair"].token1 not in BLACKLIST,
            pools_info
        )
    )

    return pools_info[:variation.number_farms]

def main(
    client: Client,
    api: API, 
    user: dict[str, any],
    variation: Variation
) -> None:
    pools = get_pools() # get all pools from minichef
    farms = get_aprs(pools) # get the aprs from minicheft pools
    pools_info = get_pool_info(pools, farms, variation)
    text = f"{variation.text()}\n\n"
    for pool in pools_info:
        text += f'{pool["pair"].name_for_tweet}\n'
    text += "\n🔗 https://app.pangolin.exchange/#/beta/pool"
    text += "\n#Pangolindex #Avalanche"

    tweet_params = {
        "text": text,
        "user_auth": True
    }

    if GENERATE_IMAGE:
        img = create_image(pools_info, variation)
        media = api.media_upload('image.png', file=img)
        tweet_params["media_ids"] = [media.media_id_string]

    response = client.create_tweet(**tweet_params)
    tweet_data = response.data
    print(f"New top {variation.number_farms} farms tweet: \nhttps://twitter.com/{user['username']}/status/{tweet_data['id']}")
    logger.info(f"New top {variation.number_farms} farms tweet: https://twitter.com/{user['username']}/status/{tweet_data['id']}")
