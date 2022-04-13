import logging

from queue import Queue
from tweepy import API, Client
from web3 import Web3
from web3.middleware import geth_poa_middleware

from src.classes.token import Token
from src.constants.config import ABIS, ADRESSES
from src.constants.tokens import PNG
from src.top_aprs.image import create_image
from src.top_aprs.get_apr_worker import Worker
from src.utils.graph import Graph
from src.utils.utils import is_avax

logger = logging.getLogger()

# Number of workers to work concurrent to get apr
WORKERS = 40
# Time period to tweet, in seconds
# 1 day
PERIOD = 1*24*60*60
# Number of top farms by apr
NUMBER_FARMS = 6
# Generate image to add in tweet
GENERATE_IMAGE = True

w3 = Web3(Web3.HTTPProvider("https://api.avax.network/ext/bc/C/rpc"))
w3.middleware_onion.inject(geth_poa_middleware, layer=0)
MINICHEF = w3.eth.contract(ADRESSES["PANGOLIN_MINICHEF_V2_ADDRESS"], abi=ABIS["MINICHEF_V2"])

def get_pools() -> list[str]:
    return MINICHEF.functions.lpTokens().call()

def get_top_aprs(pools: list[str]) -> list[dict[str, any]]:    
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

    def sort_func(e: dict[str, any]):
        return e['apr']['combinedApr']

    r.sort(reverse=True, key=sort_func)

    return r

def get_pool_info(pools: list[str], farms: list[dict[any]]) -> list[dict[str, any]]:
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
        }}
    '''

    query_str = "{"
    for farm in farms:
        address = pools[farm['pid']]
        query_str += template.format(address.lower())
    query_str += "}"

    results = graph.query(query_str)

    pools_info = []
    for farm in farms:
        pid = farm['pid']
        address = pools[pid]
        result = results[f"pool_{address.lower()}"]
        rewarder = MINICHEF.functions.rewarder(pid).call()
        rewards = [PNG]
        if rewarder != "0x0000000000000000000000000000000000000000":
            rewarder_contract = w3.eth.contract(rewarder, abi=ABIS["REWARDER_VIA_MULTIPLIER"])
            reward_tokens = rewarder_contract.functions.getRewardTokens().call()
            reward_tokens = map(lambda x: Token(address=x), reward_tokens)
            rewards.extend(reward_tokens)

        token0 = Token(
            name = result["token0"]["name"],
            symbol = "AVAX" if is_avax(result["token0"]["id"]) else result["token0"]["symbol"], 
            address = result["token0"]["id"],
        )
        token1 = Token(
            name = result["token1"]["name"],
            symbol = "AVAX" if is_avax(result["token1"]["id"]) else result["token1"]["symbol"],
            address = result["token1"]["id"],
        )

        if is_avax(token0.address):
            token1, token0 = token0, token1

        pool_info = {
            'pid': pid,
            'apr': farm['apr']['combinedApr'],
            'token0': token0,
            'token1': token1,
            "tvl": float(result["reserveUSD"]),
            'rewards': rewards,
        }

        pools_info.append(pool_info)
    return pools_info

def main(client: Client, api: API, user: dict[str, any]) -> None:
    pools = get_pools() # get all pools from minichef
    farms = get_top_aprs(pools) # get the aprs from minicheft pools and sort by apr
    pools_info = get_pool_info(pools, farms[:NUMBER_FARMS])
    text = f"Top {len(pools_info)} farms on @pangolindex by APR.\n\n"
    for pool in pools_info:
        token0: Token = pool['token0']
        token1: Token = pool['token1']
        text += f'{token0.symbol} - {token1.symbol} = {pool["apr"]}%\n'
    text += "\n#Pangolindex #Avalanche"

    tweet_params = {
        "text": text,
        "user_auth": True
    }

    if GENERATE_IMAGE:
        img = create_image(pools_info)
        media = api.media_upload('image.png', file=img)
        tweet_params["media_ids"] = [media.media_id_string]

    response = client.create_tweet(**tweet_params)
    tweet_data = response.data
    print(f"New top {NUMBER_FARMS} aprs tweet: \nhttps://twitter.com/{user['username']}/status/{tweet_data['id']}")
    logger.info(f"New top {NUMBER_FARMS} aprs tweet: https://twitter.com/{user['username']}/status/{tweet_data['id']}")
