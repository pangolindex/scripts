import json, os

from requests import ReadTimeout
from typing import Any, Dict, List, Union
from web3 import Web3
from web3.contract import Contract

from .constants.main import (
    STAKING_APEIN,
    STAKING_AVAX,
    STAKING_OOE,
)

black_list_address = [
    "0x0000000000000000000000000000000000000000",
    "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106", # Pangolin Router
    "0x60aE616a2155Ee3d9A68541Ba4544862310933d4", # Joe Router
    "0x3dAF1C6268362214eBB064647555438c6f365F96", # Joe LP PNG/AVAX
    STAKING_APEIN,
    STAKING_AVAX,
    STAKING_OOE,
]

# Open the file with all pools with png as pair and add in black list
PATH_SRC = os.path.join(os.path.abspath("."), "src")
PATH_CONST = os.path.join(PATH_SRC, "constants")
with open(os.path.join(PATH_CONST, "pools.json")) as file:
    pools = json.load(file)
    # Concat list
    black_list_address.extend(pools)

def get_png_holder(
    fromblock: int,
    toblock: int,
    png_contract: Contract,
) -> List[Dict[str, Any]]:
    transactions = []
    try:
        event_filter = png_contract.events.Transfer.createFilter(
            fromBlock = fromblock,
            toBlock = toblock,
        )
        transactions = event_filter.get_all_entries()
    except ValueError:
        return []
    except ReadTimeout:
        # In timeout divide the block range in half
        half = int(toblock/2)
        _transactions = get_png_holder(fromblock, half, png_contract)
        _transactions2 = get_png_holder(toblock-half, toblock, png_contract)
        # Concat lists
        transactions.extend(_transactions)
        transactions.extend(_transactions2)
    return transactions

def get_lp_pngavax(
    fromblock: int,
    toblock: int,
    lp_contract: Contract,
) -> Union[int , List[Dict[str, Any]]]:
    mint_transactions = []
    try:
        mint_event_filter = lp_contract.events.Mint.createFilter(
            fromBlock = fromblock,
            toBlock = toblock,
        )
        mint_transactions = mint_event_filter.get_all_entries()
    except ValueError:
        pass
    except ReadTimeout:
        # In timeout divide the block range in half
        half = int(toblock/2)
        _transactions = get_lp_pngavax(fromblock, half, lp_contract)
        _transactions2 = get_lp_pngavax(toblock-half, toblock, lp_contract)
        # Concat lists
        mint_transactions.extend(_transactions)
        mint_transactions.extend(_transactions2)
        
    burn_transactions = []
    try:
        burn_event_filter = lp_contract.events.Burn.createFilter(
            fromBlock = fromblock,
            toBlock = toblock,
        )
        burn_transactions = burn_event_filter.get_all_entries()
    except ValueError:
        pass
    except ReadTimeout:
        # In timeout divide the block range in half
        half = int(toblock/2)
        _transactions = get_lp_pngavax(fromblock, half, lp_contract)
        _transactions2 = get_lp_pngavax(toblock-half, toblock, lp_contract)
        # Concat lists
        burn_transactions.extend(_transactions)
        burn_transactions.extend(_transactions2)

    total_transactions = []
    total_transactions.extend(mint_transactions)
    total_transactions.extend(burn_transactions)
    return total_transactions

def get_staking(
    fromblock: int, 
    toblock: int, 
    staking_contract: Contract,
) -> List[Dict[str, Any]]:
    staked_transactions = []
    try:
        staked_event_filter = staking_contract.events.Staked.createFilter(
            fromBlock = fromblock,
            toBlock = toblock,
        )
        staked_transactions = staked_event_filter.get_all_entries()
    except ValueError:
        pass
    except ReadTimeout:
        # In timeout divide the block range in half
        half = int(toblock/2)
        _transactions = get_staking(fromblock, half, staking_contract)
        _transactions2 = get_staking(toblock-half, toblock, staking_contract)
        staked_transactions.extend(_transactions)
        staked_transactions.extend(_transactions2)
    
    withdrawn_transactions = []
    try:
        withdrawn_event_filter = staking_contract.events.Withdrawn.createFilter(
            fromBlock = fromblock,
            toBlock = toblock,
        )
        withdrawn_transactions = withdrawn_event_filter.get_all_entries()
    except ValueError:
        pass
    except ReadTimeout:
        # In timeout divide the block range in half
        half = int(toblock/2)
        _transactions = get_staking(fromblock, half, staking_contract)
        _transactions2 = get_staking(toblock-half, toblock, staking_contract)
        # Concat lists
        withdrawn_transactions.extend(_transactions)
        withdrawn_transactions.extend(_transactions2)

    total_transactions = []
    total_transactions.extend(staked_transactions)
    total_transactions.extend(withdrawn_transactions)
    return total_transactions

def format_png_transfers(
    transactions: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    transfers = []
    for transaction in transactions:
        try:
            args = transaction["args"]
            amount = float(Web3.fromWei(args["amount"], 'ether'))
            blockNumber = transaction["blockNumber"]
            if args["from"] not in black_list_address:
                transfers.append({"blockNumber": blockNumber, "address": args["from"], "amount": amount})
            if args["to"] not in black_list_address: 
                transfers.append({"blocknumber": blockNumber, "address": args["to"] , "amount": amount})
        except:
            continue
    return transfers
    
def format_lp_transactions(
    transactions:  List[Dict[str, Any]],
    web3: Web3,
)  ->  List[Dict[str, Any]]:
    def format_to_db(transaction: Any):
        try:
            args = transaction["args"]
            amount = float(Web3.fromWei(args["amount0"], 'ether'))
            tx = web3.eth.get_transaction(transaction['transactionHash'])
            address = tx["from"]
            blockNumber = transaction["blockNumber"]
        except:
            blockNumber = 0
            amount = 0
            address = "0x"
        return {"blockNumber": blockNumber, "address": address, "amount": amount}
    formated_transactions = list(map(format_to_db, transactions))
    return formated_transactions

def format_staking_transactions(
    transactions:  List[Dict[str, Any]]
) ->  List[Dict[str, Any]]:
    def format_to_db(transaction: Any):
        try:
            args = transaction["args"]
            amount = float(Web3.fromWei(args["amount"], 'ether'))
            address = args["user"]
            blockNumber = transaction["blockNumber"]
        except:
            blockNumber = 0
            amount = 0
            address = "0x"
        return {"blockNumber": blockNumber, "address": address, "amount": amount}
    formated_transactions = list(map(format_to_db, transactions))
    return formated_transactions