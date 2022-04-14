import os
import requests

from io import BytesIO

from src.classes.token import Token
from src.constants.config import PATH_ABS
from src.constants.tokens import PNG, WAVAX

PATH_DATA = os.path.join(PATH_ABS, "src/data")
PATH_FONTS = os.path.join(PATH_DATA, "fonts")
PATH_IMAGE = os.path.join(PATH_DATA, "images")


def is_avax(address: str) -> bool:
    return address.lower() == WAVAX.address.lower()


def human_format(num: float | int) -> str:
    magnitude = 0
    while abs(num) >= 1000:
        magnitude += 1
        num /= 1000

    magnitude = min(magnitude, 5)
    letter = ['', 'K', 'M', 'B', 'T', 'Q'][magnitude]
    return f'{num:.2f}{letter}'


def get_logo(token: Token, size: int | None) -> BytesIO | str:
    if is_avax(token.address):
        name = f"avax_{size}.png" if size else "avax.png"
        return os.path.join(PATH_IMAGE, name)

    response = requests.get(token.logo(size))

    if response.status_code == 200:
        return BytesIO(response.content)

    response = requests.get(PNG.logo(size))

    return BytesIO(response.content)
