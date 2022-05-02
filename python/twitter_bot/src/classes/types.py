from typing import TypedDict

from src.classes.token import Token
from src.classes.pair import Pair


class TokenData(TypedDict):
    token: Token
    volumeUSD: float


class PairData(TypedDict):
    pair: Pair
    volumeUSD: float
