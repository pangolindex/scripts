import json, logging, requests

from io import BytesIO
from queue import Queue
from threading import Thread
from tweepy import API, Client
from web3 import Web3
from web3.middleware import geth_poa_middleware

from src.constants.config import ABIS, ADRESSES
from src.top_aprs.image import create_image, is_avax
from src.top_aprs.get_apr_worker import Worker
from src.utils.graph import Graph

logger = logging.getLogger()

# Number of workers to work concurrent to get apr
WORKERS = 40
# Time period to tweet, in seconds
PERIOD = 8*60*60
# Number of top farms by apr
NUMBER_FARMS = 6
# Generate image to add in tweet
GENERATE_IMAGE = False

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

def get_pool_info(pools: list[str], aprs: list[dict[any]]) -> list[dict[str, any]]:
    graph = Graph("https://api.thegraph.com/subgraphs/name/pangolindex/exchange")
    query_str = """
        query($id: String!){
            pair(id: $id){
                token0{
                    symbol
                    id
                }
                token1{
                    symbol
                    id
                }
                reserveUSD
            }
        }
    """
    pools_info = []
    for pool in aprs:
        pid = pool['pid']
        address = pools[pid]
        params = {
            'id': address.lower()
        }
        result = graph.query(query_str, params)
        rewarder = MINICHEF.functions.rewarder(pid).call()
        rewards = ["0x60781C2586D68229fde47564546784ab3fACA982"]
        if rewarder != "0x0000000000000000000000000000000000000000":
            rewarder_contract = w3.eth.contract(rewarder, abi=ABIS["REWARDER_VIA_MULTIPLIER"])
            reward_tokens = rewarder_contract.functions.getRewardTokens().call()
            rewards.extend(reward_tokens)

        token0 = result["pair"]["token0"]
        token1 = result["pair"]["token1"]
        if is_avax(token0["id"]):
            token1, token0 = token0, token1

        pool_info = {
            'pid': pool["pid"],
            'apr': pool['apr']['combinedApr'],
            'token0': {
                "address": Web3.toChecksumAddress(token0["id"]),
                "symbol": token0["symbol"] if not is_avax(token0["id"]) else "AVAX",
            },
            'token1': {
                "address": Web3.toChecksumAddress(token1["id"]),
                "symbol": token1["symbol"] if not is_avax(token1["id"]) else "AVAX",
            },
            "tvl": float(result["pair"]["reserveUSD"]),
            'rewards': rewards
        }
        pools_info.append(pool_info)
    return pools_info

def main(client: Client, api: API, user: dict[str, any]) -> None:
    pools = get_pools()
    aprs = get_top_aprs(pools)
    pools_info = get_pool_info(pools, aprs[:NUMBER_FARMS])
    text = f"Top {len(pools_info)} farms of @pangolindex by APR.\n\n"
    for pool in pools_info:
        text += f'{pool["token0"]["symbol"]} - {pool["token1"]["symbol"]} = {pool["apr"]}%\n'
    text += "\n#Pangolindex #Avalanche"

    tweet_params = {
        "text": text,
        "user_auth": True
    }

    if GENERATE_IMAGE:
        img = create_image(pools_info)
        media = api.media_upload('image.png', file=img)
        tweet_params["media_ids"] = [media['media_id']]

    response = client.create_tweet(**tweet_params)
    tweet_data = response.data
    print(f"New top {NUMBER_FARMS} aprs tweet: \nhttps://twitter.com/{user['username']}/status/{tweet_data['id']}")
    logger.info(f"New top {NUMBER_FARMS} aprs tweet: https://twitter.com/{user['username']}/status/{tweet_data['id']}")
