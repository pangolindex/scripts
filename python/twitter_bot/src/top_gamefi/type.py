from typing import TypedDict

from src.classes.token import Token


class TokenData(TypedDict):
    token: Token
    volumeUSD: float
