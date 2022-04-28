from typing import TypedDict

from src.classes.token import Token

class APRData(TypedDict):
    pid: int
    apr: dict[str, int]

class FarmData(TypedDict):
    pid: int
    APR: int
    token0: Token
    token1: Token
    TVL: float
    volume: float
    rewards: list[Token]