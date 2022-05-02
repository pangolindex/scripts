from typing import TypedDict

from src.classes.token import Token
from src.classes.types import PairData

class APRData(TypedDict):
    pid: int
    apr: dict[str, int]

class FarmData(PairData):
    pid: int
    APR: int
    TVL: float
    rewards: list[Token]