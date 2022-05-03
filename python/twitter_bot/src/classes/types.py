from typing import TypedDict

from src.classes.token import Token
from src.classes.pair import Pair


class TokenData(TypedDict):
    token: Token
    volumeUSD: float


class PairData(TypedDict):
    pair: Pair
    volumeUSD: float


class APRData(TypedDict):
    pid: int
    apr: dict[str, int]


class FarmData(PairData):
    pid: int
    APR: int
    TVL: float
    rewards: list[Token]
