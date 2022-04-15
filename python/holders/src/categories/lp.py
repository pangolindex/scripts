from json import dumps
from prompt_toolkit.widgets import TextArea, ProgressBar
from prompt_toolkit.layout.controls import FormattedTextControl
from queue import Queue
from requests import ReadTimeout
from web3 import Web3
from web3.contract import Contract

from src.categories.worker import BaseWoker
from src.database.database import Database
from src.database.schema import Transaction

CONTRACT_ABI = [{"type":"constructor","stateMutability":"nonpayable","payable":False,"inputs":[]},{"type":"event","name":"Approval","inputs":[{"type":"address","name":"owner","internalType":"address","indexed":True},{"type":"address","name":"spender","internalType":"address","indexed":True},{"type":"uint256","name":"value","internalType":"uint256","indexed":False}],"anonymous":False},{"type":"event","name":"Burn","inputs":[{"type":"address","name":"sender","internalType":"address","indexed":True},{"type":"uint256","name":"amount0","internalType":"uint256","indexed":False},{"type":"uint256","name":"amount1","internalType":"uint256","indexed":False},{"type":"address","name":"to","internalType":"address","indexed":True}],"anonymous":False},{"type":"event","name":"Mint","inputs":[{"type":"address","name":"sender","internalType":"address","indexed":True},{"type":"uint256","name":"amount0","internalType":"uint256","indexed":False},{"type":"uint256","name":"amount1","internalType":"uint256","indexed":False}],"anonymous":False},{"type":"event","name":"Swap","inputs":[{"type":"address","name":"sender","internalType":"address","indexed":True},{"type":"uint256","name":"amount0In","internalType":"uint256","indexed":False},{"type":"uint256","name":"amount1In","internalType":"uint256","indexed":False},{"type":"uint256","name":"amount0Out","internalType":"uint256","indexed":False},{"type":"uint256","name":"amount1Out","internalType":"uint256","indexed":False},{"type":"address","name":"to","internalType":"address","indexed":True}],"anonymous":False},{"type":"event","name":"Sync","inputs":[{"type":"uint112","name":"reserve0","internalType":"uint112","indexed":False},{"type":"uint112","name":"reserve1","internalType":"uint112","indexed":False}],"anonymous":False},{"type":"event","name":"Transfer","inputs":[{"type":"address","name":"from","internalType":"address","indexed":True},{"type":"address","name":"to","internalType":"address","indexed":True},{"type":"uint256","name":"value","internalType":"uint256","indexed":False}],"anonymous":False},{"type":"function","stateMutability":"view","payable":False,"outputs":[{"type":"bytes32","name":"","internalType":"bytes32"}],"name":"DOMAIN_SEPARATOR","inputs":[],"constant":True},{"type":"function","stateMutability":"view","payable":False,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"MINIMUM_LIQUIDITY","inputs":[],"constant":True},{"type":"function","stateMutability":"view","payable":False,"outputs":[{"type":"bytes32","name":"","internalType":"bytes32"}],"name":"PERMIT_TYPEHASH","inputs":[],"constant":True},{"type":"function","stateMutability":"view","payable":False,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"allowance","inputs":[{"type":"address","name":"","internalType":"address"},{"type":"address","name":"","internalType":"address"}],"constant":True},{"type":"function","stateMutability":"nonpayable","payable":False,"outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"approve","inputs":[{"type":"address","name":"spender","internalType":"address"},{"type":"uint256","name":"value","internalType":"uint256"}],"constant":False},{"type":"function","stateMutability":"view","payable":False,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"balanceOf","inputs":[{"type":"address","name":"","internalType":"address"}],"constant":True},{"type":"function","stateMutability":"nonpayable","payable":False,"outputs":[{"type":"uint256","name":"amount0","internalType":"uint256"},{"type":"uint256","name":"amount1","internalType":"uint256"}],"name":"burn","inputs":[{"type":"address","name":"to","internalType":"address"}],"constant":False},{"type":"function","stateMutability":"view","payable":False,"outputs":[{"type":"uint8","name":"","internalType":"uint8"}],"name":"decimals","inputs":[],"constant":True},{"type":"function","stateMutability":"view","payable":False,"outputs":[{"type":"address","name":"","internalType":"address"}],"name":"factory","inputs":[],"constant":True},{"type":"function","stateMutability":"view","payable":False,"outputs":[{"type":"uint112","name":"_reserve0","internalType":"uint112"},{"type":"uint112","name":"_reserve1","internalType":"uint112"},{"type":"uint32","name":"_blockTimestampLast","internalType":"uint32"}],"name":"getReserves","inputs":[],"constant":True},{"type":"function","stateMutability":"nonpayable","payable":False,"outputs":[],"name":"initialize","inputs":[{"type":"address","name":"_token0","internalType":"address"},{"type":"address","name":"_token1","internalType":"address"}],"constant":False},{"type":"function","stateMutability":"view","payable":False,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"kLast","inputs":[],"constant":True},{"type":"function","stateMutability":"nonpayable","payable":False,"outputs":[{"type":"uint256","name":"liquidity","internalType":"uint256"}],"name":"mint","inputs":[{"type":"address","name":"to","internalType":"address"}],"constant":False},{"type":"function","stateMutability":"view","payable":False,"outputs":[{"type":"string","name":"","internalType":"string"}],"name":"name","inputs":[],"constant":True},{"type":"function","stateMutability":"view","payable":False,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"nonces","inputs":[{"type":"address","name":"","internalType":"address"}],"constant":True},{"type":"function","stateMutability":"nonpayable","payable":False,"outputs":[],"name":"permit","inputs":[{"type":"address","name":"owner","internalType":"address"},{"type":"address","name":"spender","internalType":"address"},{"type":"uint256","name":"value","internalType":"uint256"},{"type":"uint256","name":"deadline","internalType":"uint256"},{"type":"uint8","name":"v","internalType":"uint8"},{"type":"bytes32","name":"r","internalType":"bytes32"},{"type":"bytes32","name":"s","internalType":"bytes32"}],"constant":False},{"type":"function","stateMutability":"view","payable":False,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"price0CumulativeLast","inputs":[],"constant":True},{"type":"function","stateMutability":"view","payable":False,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"price1CumulativeLast","inputs":[],"constant":True},{"type":"function","stateMutability":"nonpayable","payable":False,"outputs":[],"name":"skim","inputs":[{"type":"address","name":"to","internalType":"address"}],"constant":False},{"type":"function","stateMutability":"nonpayable","payable":False,"outputs":[],"name":"swap","inputs":[{"type":"uint256","name":"amount0Out","internalType":"uint256"},{"type":"uint256","name":"amount1Out","internalType":"uint256"},{"type":"address","name":"to","internalType":"address"},{"type":"bytes","name":"data","internalType":"bytes"}],"constant":False},{"type":"function","stateMutability":"view","payable":False,"outputs":[{"type":"string","name":"","internalType":"string"}],"name":"symbol","inputs":[],"constant":True},{"type":"function","stateMutability":"nonpayable","payable":False,"outputs":[],"name":"sync","inputs":[],"constant":False},{"type":"function","stateMutability":"view","payable":False,"outputs":[{"type":"address","name":"","internalType":"address"}],"name":"token0","inputs":[],"constant":True},{"type":"function","stateMutability":"view","payable":False,"outputs":[{"type":"address","name":"","internalType":"address"}],"name":"token1","inputs":[],"constant":True},{"type":"function","stateMutability":"view","payable":False,"outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"totalSupply","inputs":[],"constant":True},{"type":"function","stateMutability":"nonpayable","payable":False,"outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"transfer","inputs":[{"type":"address","name":"to","internalType":"address"},{"type":"uint256","name":"value","internalType":"uint256"}],"constant":False},{"type":"function","stateMutability":"nonpayable","payable":False,"outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"transferFrom","inputs":[{"type":"address","name":"from","internalType":"address"},{"type":"address","name":"to","internalType":"address"},{"type":"uint256","name":"value","internalType":"uint256"}],"constant":False}]

class Worker(BaseWoker):
    def __init__(
        self,
        category: str,
        airdrop_id: str,
        last_block: int,
        interval: int,
        queue: Queue,
        contract: list[Contract],
        web3: Web3,
        database: Database,
        progressbar: ProgressBar,
        textarea: TextArea,
        label: FormattedTextControl
    ) -> None:
        BaseWoker.__init__(
            self,
            category = category,
            airdrop_id = airdrop_id,
            queue = queue,
            interval = interval,
            last_block = last_block,
            contract = contract,
            web3 = web3,
            database = database,
            progressbar = progressbar,
            textarea = textarea,
            label = label
        )

        self.count_tx_lp = 0

    def format_lp_transactions(self, transactions:  list[dict[str, any]]) -> list[Transaction]:
        import time
        def format_to_db(transaction: any) -> Transaction:
            try:
                args = transaction["args"]
                amount = int(args["amount0"])
                tx = self.web3.eth.get_transaction(transaction['transactionHash'])
                address = tx["from"]
                block_number = transaction["blockNumber"]
            except Exception as e:
                self.add_message(str(e))
                block_number = 0
                amount = 0
                address = "0x"

            return Transaction(
                        airdrop_id = self.airdrop_id,
                        category = self.category,
                        block_number = block_number,
                        address = address,
                        amount = amount,
                    )

        return list(map(format_to_db, transactions))

    def get_mint_transactions(self, from_block: int, to_block: int) -> list[dict[str, any]]:
        mint_transactions = []
        for contract in self.contract:
            try:
                mint_event_filter = contract.events.Mint.createFilter(
                    fromBlock = from_block,
                    toBlock = to_block,
                )
                mint_transactions.extend(mint_event_filter.get_all_entries())
            except (ReadTimeout, ValueError):
                # In error divide the block range in half
                half = to_block // 2
                _transactions = self.get_mint_transactions(from_block, half)
                _transactions2 = self.get_mint_transactions(to_block-half, to_block)
                # Concat lists
                mint_transactions.extend(_transactions)
                mint_transactions.extend(_transactions2)
            except Exception as e:
                self.add_message(f"Worker_LP-{self.name} Error: {e}")
        return mint_transactions

    def get_burn_transactions(self, fromblock: int, toblock: int) -> list[dict[str, any]]:
        burn_transactions = []
        for contract in self.contract:
            try:
                burn_event_filter = contract.events.Burn.createFilter(
                    fromBlock = fromblock,
                    toBlock = toblock,
                )
                burn_transactions.extend(burn_event_filter.get_all_entries())
            except (ReadTimeout , ValueError):
                # In error divide the block range in half
                half = toblock // 2
                _transactions = self.get_burn_transactions(fromblock, half)
                _transactions2 = self.get_burn_transactions(toblock-half, toblock)
                # Concat lists
                burn_transactions.extend(_transactions)
                burn_transactions.extend(_transactions2)
        return burn_transactions

    def run(self):
        self.add_message(f"Running Worker_LP-{self.name}")
        self.stopped = False
        while not self.queue.empty():
            if self.stopped:
                return

            fromblock = self.queue.get()
            toblock = min(fromblock+self.interval, self.last_block)

            #Get PNG balance from mint/burn events in contract of LP PNG/AVAX 
            transactions_lp = self.get_mint_transactions(fromblock, toblock)
            transactions_lp.extend(self.get_burn_transactions(fromblock, toblock))
            transactions = self.format_lp_transactions(transactions_lp)
            if len(transactions) > 0:
                self.count_tx_lp += len(transactions)
                self.add_message(f"Worker_LP-{self.name} found {len(transactions)} LP transactions")
                self.database.insert_many_transactions(transactions)
            self.update_progress_bar(toblock)
            self.queue.task_done()
        self.add_message(f"Worker_LP-{self.name} stopped")
        self.finished = True

        self.stop_app()
