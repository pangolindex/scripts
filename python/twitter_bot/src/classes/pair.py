from eth_utils import to_checksum_address

from src.classes.token import Token
from src.utils.token import is_avax

class Pair:
    def __init__(
        self,
        address: str,
        token0: Token,
        token1: Token
    ):
        self.address = to_checksum_address(address)

        if is_avax(token0):
            self.token0 = token1
            self.token1 = token0
        else:
            self.token0 = token0
            self.token1 = token1

        self.name = f"{self.token0.symbol} - {self.token1.symbol}"
        self.name_for_tweet = f"${self.token0.symbol} - ${self.token1.symbol}"
