from threading import Thread
from typing import List
from web3 import Web3
from web3.contract import Contract

from .block import Block
from .database import Database
from .utils import (
    get_png_holder,
    get_lp_pngavax,
    get_staking,
    format_png_transfers,
    format_lp_transactions,
    format_staking_transactions
)

class Worker_PNG(Thread):
    def __init__(
        self, 
        start_block: int,
        range: int,
        block: Block, 
        database: Database, 
        png_contract: Contract, 
    ) -> None:
        Thread.__init__(self)
        self.block: Block = block
        self.database: Database = database

        self.png_contract: Contract = png_contract

        self.start_block: int = start_block
        self.range = range
        self.count_tx_png_holders: int = 0

    def run(self):
        print(f"Running Worker_PNG-{self.name}, started block: {self.start_block}")
        actual_block = self.start_block
        fromblock = actual_block
        while fromblock < self.block.last_block:
            fromblock = actual_block
            actual_block += self.range
            self.block.actual_block = actual_block

            toblock = min(actual_block, self.block.last_block)

            #Get PNG balance from transfers on transfer event in PNG contract
            transactions = get_png_holder(fromblock, toblock, self.png_contract)
            if transactions:
                transfers = format_png_transfers(transactions)
                self.count_tx_png_holders += len(transfers)
                print(f"Worker_PNG-{self.name} found {len(transfers)} PNG transfers")
                self.database.insert_many_png_holder(transfers)

            actual_block = self.block.actual_block

class Worker_LP(Thread):
    def __init__(
        self, 
        start_block: int,
        range: int,
        block: Block, 
        database: Database, 
        lp_contract: Contract, 
        w3: Web3
    ) -> None:
        Thread.__init__(self)
        self.block: Block = block
        self.database: Database = database

        self.web3: Web3 = w3
        self.lp_contract: Contract = lp_contract

        self.start_block: int = start_block
        self.range = range
        self.count_tx_lp_pngavax: int = 0

    def run(self):
        print(f"Running Worker_LP-{self.name}, started block: {self.start_block}")
        actual_block = self.start_block
        fromblock = actual_block
        while fromblock < self.block.last_block:
            fromblock = actual_block
            actual_block += self.range
            self.block.actual_block = actual_block

            toblock = min(actual_block, self.block.last_block)

            #Get PNG balance from mint/burn events in contract of LP PNG/AVAX 
            transactions_lp = get_lp_pngavax(fromblock, toblock, self.lp_contract)
            if  transactions_lp:
                transactions = format_lp_transactions(transactions_lp, self.web3)
                self.count_tx_lp_pngavax += len(transactions)
                print(f"Worker_LP-{self.name} found {len(transactions)} LP transactions")
                self.database.insert_many_lp_pngavax(transactions)

            actual_block = self.block.actual_block

class Worker_STAKING(Thread):
    def __init__(
        self, 
        start_block: int,
        range: int,
        block: Block, 
        database: Database, 
        staking_avax: Contract,
        staking_ooe: Contract,
        staking_apein: Contract,
    ) -> None:
        Thread.__init__(self)
        self.block: Block = block
        self.database: Database = database

        self.staking_contracts = [staking_avax, staking_ooe, staking_apein]

        self.start_block: int = start_block
        self.range = range
        self.count_tx_staking: int = 0

    def run(self):
        print(f"Running Worker_STAKING-{self.name}, started block: {self.start_block}")
        actual_block = self.start_block
        fromblock = actual_block
        while fromblock < self.block.last_block:
            fromblock = actual_block
            actual_block += self.range
            self.block.actual_block = actual_block

            toblock = min(actual_block, self.block.last_block)

            #Get PNG balance from staked/withdrawn events in contract of Staking PNG
            transactions_staking = []
            for staking_contract in self.staking_contracts:
                _transactions_staking = get_staking(fromblock, toblock, staking_contract)
                transactions_staking.extend(_transactions_staking)

            if transactions_staking:
                transactions = format_staking_transactions(transactions_staking)
                self.count_tx_staking += len(transactions)
                print(f"Worker_STAKING-{self.name} found {len(transactions)} staking transactions")
                self.database.insert_many_staking(transactions)

            actual_block = self.block.actual_block
