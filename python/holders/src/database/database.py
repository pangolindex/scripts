from json import dumps
from textwrap import indent
from mongoengine import connect, disconnect
from pymongo.command_cursor import CommandCursor

from src.database.schema import Transaction


class Database():
    def __init__(self, connection_string: str):
        self.is_connected = False
        self.connection_string = connection_string
        self.connect()

    def connect(self):
        if(self.is_connected):
            return
        connect("database", host=self.connection_string)

    def close(self):
        if self.is_connected:
            disconnect()
            self.is_connected = False

    def insert_many_transactions(self, transactions: list[Transaction]):
        """Insert Many Transactions
        Args:
            transactions (list[Transaction]): List of transactions
        """
        Transaction.objects.insert(transactions)

    def category_address_sum(self, category: str) -> CommandCursor | None:
        """Return Sum of category amount for each address
            category (str): Category of transaction
        Returns:
           CommandCursor | None: cursor object
        """
        return Transaction.objects(category=category).aggregate([{
            "$group": {
                "_id": "$address",
                "amount": {
                    "$sum": "$amount"
                }
            }
        }])

    def total_amount_category(self, category: str) -> float:
        """Return Total amount of category
            category (str): Category of transaction
        Returns:
           float: total amount
        """
        return Transaction.objects(category=category).sum('amount')

    def total_airdrop_result(self, airdrop_id: str, categories: str) -> CommandCursor | None:
        """Return Total amount of category
            category (str): Category of transaction
        Returns:
           CommandCursor | None: total amount
        """
        group = {
            "$group": {
                "_id": "$address",
                "total_amount": {
                    "$sum": "$amount"
                }
            }
        }
        for category in categories:
            # for each category, sum the total amount of address in this category
            group["$group"][category] = {
                    "$sum": {"$cond": [
                        {
                            "$eq": [
                                "$category", category
                            ]
                        },
                       "$amount",
                       0
                    ]}
                }
        return Transaction.objects(airdrop_id=airdrop_id).aggregate([group])
