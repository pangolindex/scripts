from pymongo import MongoClient
from pymongo.command_cursor import CommandCursor
from threading import Thread
from typing import Dict, List, Any, Optional

from .block import Block

class Database():
    def __init__(self, connection_string: str):
        
        if connection_string:
            # If exist connection_string is db from cloud
            self.client = MongoClient(connection_string)
        else:
            # If not exist connection_string is db local
            self.client = MongoClient()
            
        print(f'Client: {self.client}')
        print('---------------------------------------------')
        self.db = self.client.database
        print(f'Database: {self.db}')
        print('---------------------------------------------')

        self.png_holder = self.db.png_holder # Collection
        self.lp_pngavax = self.db.lp_pngavax # Collection
        self.staking = self.db.staking # Collection
        
        #Select distinct address and sum all amount each address
        self.address_sum = [
            {
                "$group":{
                    "_id" : "$address", 
                    "amount": {
                        "$sum": "$amount"
                    }
                }
            }
        ]
        #Sum of total PNG 
        self.total_sum = [
            { "$group": 
                { 
                    "_id" : None, 
                    "amount" : { 
                        "$sum": "$amount" 
                    } 
                } 
            }
        ]

    def close(self) -> bool:
        try:
            self.client.close()
            return True
        except:
            return False

    # PNG holders
    def insert_many_png_holder(self, transfers: List[Dict[str, Any]]) -> bool:
        """Insert Many Transfers of PNG

        Args:
            transactions (List[Dict[str, Any]]): List of transactions

        Returns:
            bool: Fail
        """
        try:
            self.png_holder.insert_many(transfers)
            return True
        except Exception as e:
            print(f'Error in insert png holder: \n {e}')
            return False

    def fetch_all_png_holder(self) -> Optional[CommandCursor]:
        """Return Sum of amount of PNG in transfers for each address

        Returns:
            Optional[CommandCursor]: cursor object
        """
        try:
            return self.png_holder.aggregate(self.address_sum)
        except Exception as e:
            print(f'Error in fetch all png holders: \n {e}')
            return None

    def total_png(self) -> float:
        """Return Total amount of PNG in transfers

        Returns:
            float: total
        """
        try:
            results = self.png_holder.aggregate(self.total_sum)
            for result in results:
                amount = result["amount"]
                if not isinstance(amount, float):
                    return float(amount)
                else:
                    return amount
            return 0.0
        except Exception as e:
            print(f'Error in fetch total_png: \n {e}')
            return 0.0

    # PNG/AVAX LP tokens
    def insert_many_lp_pngavax(self, transactions: List[Dict[str, Any]]) -> bool:
        """Insert Many Transacions of LP

        Args:
            transactions (List[Dict[str, Any]]): List of transactions

        Returns:
            bool: Fail
        """
        try:
            self.lp_pngavax.insert_many(transactions)
            return True
        except Exception as e:
            print(f'Error in insert lp: \n {e}')
            return False

    def fetch_all_lp_pngavax(self) -> Optional[CommandCursor]:
        """Return Sum of amount PNG in LP PNG/AVAX for each address

        Returns:
            Optional[CommandCursor]: [description]
        """
        try:
            return self.lp_pngavax.aggregate(self.address_sum)
        except Exception as e:
            print(f'Error in fetch all lp: \n {e}')
            return None

    def total_lp(self) -> float:
        """Return Total of PNG in Mint/Burn LP PNG/AVAX

        Returns:
            float: total
        """
        try:
            results = self.lp_pngavax.aggregate(self.total_sum)
            for result in results:
                amount = result["amount"]
                if not isinstance(amount, float):
                    return float(amount)
                else:
                    return amount
            return 0.0
        except Exception as e:
            print(f'Error in fetch total_lp: \n {e}')
            return 0.0
    
    # STAKING
    def insert_many_staking(self, transactions: List[Dict[str, Any]]) -> bool:
        """Insert Many Transacions of Staking

        Args:
            transactions (List[Dict[str, Any]]): List of transactions

        Returns:
            bool: Fail
        """
        try:
            self.staking.insert_many(transactions)
            return True
        except Exception as e:
            print(f'Error in insert staking: \n {e}')
            return False

    def fetch_all_staking(self) -> Optional[CommandCursor]:
        """Return Sum of amount staking for each address

        Returns:
            Optional[CommandCursor]: cursor object
        """
        try:
            return self.staking.aggregate(self.address_sum)
        except Exception as e:
            print(f'Error in fetch all staking: \n {e}')
            return None
            
    def total_staking(self) -> float:
        """Return Total of PNG Staked

        Returns:
            float: total
        """
        try:
            results = self.staking.aggregate(self.total_sum)
            for result in results:
                amount = result["amount"]
                if not isinstance(amount, float):
                    return float(amount)
                else:
                    return amount
            return 0.0
        except Exception as e:
            print(f'Error in fetch total_staking: \n {e}')
            return 0.0
