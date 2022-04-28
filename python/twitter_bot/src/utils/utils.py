import os
import requests

from io import BytesIO
from PIL import Image, ImageDraw, ImageChops

from src.classes.token import Token
from src.constants.config import PATH_ABS
from src.constants.tokens import PNG, WAVAX

PATH_FONTS = os.path.join(PATH_ABS, "src/fonts")
PATH_IMAGE = os.path.join(PATH_ABS, "src/images")


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


def create_mask(size: tuple[int, int]) -> Image.Image:
    mask = Image.new('L', size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0) + size, fill=255)
    mask = mask.resize(size, Image.ANTIALIAS)
    return mask

def crop_logo(img: Image) -> Image.Image:
    """Crop the logo in circle

    Args:
        img (Image): The logo image

    Returns:
        Image: The cropped logo image
    """
    mask = create_mask(img.size)
    mask = ImageChops.darker(mask, img.split()[-1])
    img.putalpha(mask)
    return img


def get_logo(token: Token, size: int | None = None) -> Image.Image:
    if token._logo:
        response = requests.get(token.logo())
        img = Image.open(BytesIO(response.content)).convert("RGBA")
        img = img.resize((size, size), Image.ANTIALIAS)
        img = crop_logo(img)
        return img
        
    if is_avax(token.address):
        name = f"avax_{size}.png" if size else "avax.png"
        return Image.open(os.path.join(PATH_IMAGE, name)).convert("RGBA")

    response = requests.get(token.logo(size))

    if response.status_code == 200:
        img = Image.open(BytesIO(response.content)).convert("RGBA")
        img = crop_logo(img)
        return img.convert("RGBA")

    response = requests.get(PNG.logo(size))

    return Image.open(BytesIO(response.content)).convert("RGBA")
