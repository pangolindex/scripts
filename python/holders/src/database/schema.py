from mongoengine import *

from src.constants.main import AIRDROP_CATEGORIES

class Transaction(Document):
    airdrop_id = StringField()
    category = StringField(choices=AIRDROP_CATEGORIES)
    block_number = IntField()
    address = StringField()
    amount = FloatField()