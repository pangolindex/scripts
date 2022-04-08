from prompt_toolkit.widgets import TextArea, ProgressBar
from prompt_toolkit.layout.controls import FormattedTextControl
from requests import ReadTimeout
from threading import Thread
from queue import Queue
from web3 import Web3
from web3.contract import Contract

from src.categories.worker import BaseWoker
from src.database.database import Database
from src.database.schema import Transaction

CONTRACT_ABI = [{"type":"constructor","stateMutability":"nonpayable","inputs":[{"type":"address","name":"_rewardsToken","internalType":"address"},{"type":"address","name":"_stakingToken","internalType":"address"}]},{"type":"event","name":"OwnershipTransferred","inputs":[{"type":"address","name":"previousOwner","internalType":"address","indexed":True},{"type":"address","name":"newOwner","internalType":"address","indexed":True}],"anonymous":False},{"type":"event","name":"Recovered","inputs":[{"type":"address","name":"token","internalType":"address","indexed":False},{"type":"uint256","name":"amount","internalType":"uint256","indexed":False}],"anonymous":False},{"type":"event","name":"RewardAdded","inputs":[{"type":"uint256","name":"reward","internalType":"uint256","indexed":False}],"anonymous":False},{"type":"event","name":"RewardPaid","inputs":[{"type":"address","name":"user","internalType":"address","indexed":True},{"type":"uint256","name":"reward","internalType":"uint256","indexed":False}],"anonymous":False},{"type":"event","name":"RewardsDurationUpdated","inputs":[{"type":"uint256","name":"newDuration","internalType":"uint256","indexed":False}],"anonymous":False},{"type":"event","name":"Staked","inputs":[{"type":"address","name":"user","internalType":"address","indexed":True},{"type":"uint256","name":"amount","internalType":"uint256","indexed":False}],"anonymous":False},{"type":"event","name":"Withdrawn","inputs":[{"type":"address","name":"user","internalType":"address","indexed":True},{"type":"uint256","name":"amount","internalType":"uint256","indexed":False}],"anonymous":False},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"balanceOf","inputs":[{"type":"address","name":"account","internalType":"address"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"earned","inputs":[{"type":"address","name":"account","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"exit","inputs":[]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"getReward","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"getRewardForDuration","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"lastTimeRewardApplicable","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"lastUpdateTime","inputs":[]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"notifyRewardAmount","inputs":[{"type":"uint256","name":"reward","internalType":"uint256"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"owner","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"periodFinish","inputs":[]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"recoverERC20","inputs":[{"type":"address","name":"tokenAddress","internalType":"address"},{"type":"uint256","name":"tokenAmount","internalType":"uint256"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"renounceOwnership","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"rewardPerToken","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"rewardPerTokenStored","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"rewardRate","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"rewards","inputs":[{"type":"address","name":"","internalType":"address"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"rewardsDuration","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"contract IERC20"}],"name":"rewardsToken","inputs":[]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setRewardsDuration","inputs":[{"type":"uint256","name":"_rewardsDuration","internalType":"uint256"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"stake","inputs":[{"type":"uint256","name":"amount","internalType":"uint256"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"stakeWithPermit","inputs":[{"type":"uint256","name":"amount","internalType":"uint256"},{"type":"uint256","name":"deadline","internalType":"uint256"},{"type":"uint8","name":"v","internalType":"uint8"},{"type":"bytes32","name":"r","internalType":"bytes32"},{"type":"bytes32","name":"s","internalType":"bytes32"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"contract IERC20"}],"name":"stakingToken","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"totalSupply","inputs":[]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"transferOwnership","inputs":[{"type":"address","name":"newOwner","internalType":"address"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"userRewardPerTokenPaid","inputs":[{"type":"address","name":"","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"withdraw","inputs":[{"type":"uint256","name":"amount","internalType":"uint256"}]}]

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

        self.count_tx_staking = 0

    def format_staking_transactions(self, transactions: list[dict[str, any]]) -> list[Transaction]:
        def format_to_db(transaction: any) -> Transaction:
            try:
                args = transaction["args"]
                amount = int(args["amount"])
                address = args["user"]
                block_number = transaction["blockNumber"]
            except Exception as e:
                self.add_message(str(e))
                block_number = 0
                amount = 0
                address = "0x"

            return  Transaction(
                        airdrop_id = self.airdrop_id,
                        category = self.category,
                        block_number = block_number,
                        address = address,
                        amount = amount,
                    )

        return list(map(format_to_db, transactions))

    def get_staked_transactions(self, fromblock: int, toblock: int,) -> list[dict[str, any]]:
        staked_transactions = []
        for contract in self.contract:
            try:
                staked_event_filter = contract.events.Staked.createFilter(
                    fromBlock = fromblock,
                    toBlock = toblock,
                )
                staked_transactions.extend(staked_event_filter.get_all_entries())
            except (ReadTimeout, ValueError):
                # In error divide the block range in half
                half = toblock // 2
                _transactions = self.get_staking(fromblock, half)
                _transactions2 = self.get_staking(toblock-half, toblock)
                staked_transactions.extend(_transactions)
                staked_transactions.extend(_transactions2)
        return staked_transactions

    def get_withdrawn_transactions(self, fromblock: int, toblock: int,) -> list[dict[str, any]]:
        withdrawn_transactions = []
        for contract in self.contract:
            try:
                withdrawn_event_filter = contract.events.Withdrawn.createFilter(
                    fromBlock = fromblock,
                    toBlock = toblock,
                )
                withdrawn_transactions.extend(withdrawn_event_filter.get_all_entries())
            except (ReadTimeout, ValueError):
                # In error divide the block range in half
                half = toblock // 2
                _transactions = self.get_staking(fromblock, half)
                _transactions2 = self.get_staking(toblock-half, toblock)
                # Concat lists
                withdrawn_transactions.extend(_transactions)
                withdrawn_transactions.extend(_transactions2)
        return withdrawn_transactions

    def run(self):
        self.add_message(f"Running Worker_STAKING-{self.name}")
        self.stopped = False
        while True:
            if self.queue.empty():
                break

            if self.stopped:
                return

            fromblock = self.queue.get()
            toblock = min(fromblock+self.interval, self.last_block)

            #Get PNG balance from staked/withdrawn events in contract of Staking PNG
            transactions_staking = self.get_staked_transactions(fromblock, toblock)
            transactions_staking.extend(self.get_withdrawn_transactions(fromblock, toblock))
            if len(transactions_staking) > 0:
                transactions = self.format_staking_transactions(transactions_staking)
                self.count_tx_staking += len(transactions)
                self.add_message(f"Worker_STAKING-{self.name} found {len(transactions)} staking transactions")
                #self.database.insert_many_staking(transactions)
            self.update_progress_bar(toblock)
            self.queue.task_done()
        self.add_message(f"Worker_STAKING-{self.name} stopped")
        self.finished = True

        self.stop_app()
