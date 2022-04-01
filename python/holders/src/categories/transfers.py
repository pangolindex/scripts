from queue import Queue
from unicodedata import category
from prompt_toolkit.widgets import TextArea, ProgressBar
from prompt_toolkit.layout.controls import FormattedTextControl
from requests import ReadTimeout
from web3 import Web3
from web3.contract import Contract

from src.categories.worker import BaseWoker
from src.utils.main import is_contract
from src.database.database import Database
from src.database.schema import Transaction

# TOKEN ABI
CONTRACT_ABI = [{"constant":True,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":False,"stateMutability":"view","type":"function"},{"constant":False,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":False,"stateMutability":"nonpayable","type":"function"},{"constant":True,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":False,"stateMutability":"view","type":"function"},{"constant":False,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":False,"stateMutability":"nonpayable","type":"function"},{"constant":True,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":False,"stateMutability":"view","type":"function"},{"constant":True,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":False,"stateMutability":"view","type":"function"},{"constant":True,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":False,"stateMutability":"view","type":"function"},{"constant":False,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":False,"stateMutability":"nonpayable","type":"function"},{"constant":True,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":False,"stateMutability":"view","type":"function"},{"payable":True,"stateMutability":"payable","type":"fallback"},{"anonymous":False,"inputs":[{"indexed":True,"name":"owner","type":"address"},{"indexed":True,"name":"spender","type":"address"},{"indexed":False,"name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":False,"inputs":[{"indexed":True,"name":"from","type":"address"},{"indexed":True,"name":"to","type":"address"},{"indexed":False,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"}]

class Worker(BaseWoker):
    def __init__(
        self,
        category: str,
        airdrop_id: str,
        queue: Queue,
        interval: int,
        last_block: int,
        contract: Contract,
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

        self.count_tx: int = 0

    def format_transfers(self, transactions: list[dict[str, any]]) -> list[Transaction]:
        transfers = []
        for transaction in transactions:
            args = transaction["args"]
            amount = float(Web3.fromWei(args["value"], 'ether'))
            block_number = transaction["blockNumber"]
            from_address = args["from"]
            to_address = args["to"]
            if not is_contract(self.web3, from_address):
                transfers.append(
                    Transaction(
                        airdrop_id = self.airdrop_id,
                        category = self.category,
                        block_number = block_number,
                        address = from_address,
                        amount = amount,
                    )
                )
            if not is_contract(self.web3, to_address):
                transfers.append(
                    Transaction(
                        airdrop_id = self.airdrop_id,
                        category = self.category,
                        block_number = block_number,
                        address = to_address,
                        amount = amount,
                    )
                )
        return transfers

    def get_transfers(
        self,
        from_block: int,
        to_block: int,
    ) -> list[dict[str, any]]:
        transactions = []
        try:
            event_filter = self.contract.events.Transfer.createFilter(
                fromBlock = from_block,
                toBlock = to_block,
            )
            transactions = event_filter.get_all_entries()
        except (ReadTimeout, ValueError):
            # In error divide the block range in half
            half = to_block // 2
            _transactions = self.get_transfers(from_block, half)
            _transactions2 = self.get_transfers(to_block-half, to_block)
            # Concat lists
            transactions.extend(_transactions)
            transactions.extend(_transactions2)
        return transactions

    def run(self):
        self.add_message(f"Running Worker_Transfers-{self.name}")
        self.stopped = False
        while True:
            if self.queue.empty():
                break

            if self.stopped:
                return

            from_block = self.queue.get()
            to_block = min(from_block + self.interval, self.last_block)
            transactions = self.get_transfers(from_block, to_block)
            if len(transactions) > 0:
                transfers = self.format_transfers(transactions)
                self.count_tx_png_holders += len(transfers)
                self.database.insert_many_transactions(transfers)
                self.add_message(f"Worker_PNG-{self.name} found {len(transfers)} Token transfers")
            self.update_progress_bar(to_block)
            self.queue.task_done()
        self.add_message(f"Worker_Transfers-{self.name} stopped")
        self.finished = True

        self.stop_app()
