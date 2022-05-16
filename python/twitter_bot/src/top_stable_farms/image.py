import os

from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

from src.constants.config import PATH_ABS
from src.classes.types import FarmData
from src.utils.utils import PATH_FONTS, get_logo

POPPINS = ImageFont.truetype(os.path.join(PATH_FONTS, "Poppins.ttf"), size=28)
POPPINS_BOLD = ImageFont.truetype(os.path.join(PATH_FONTS, "Poppins-Bold.ttf"), size=28)

def create_image(farms: list[FarmData]) -> BytesIO:
    img = Image.open(
        os.path.join(
            PATH_ABS,
            "src/top_stable_farms/images/top_3_stable_farms.png"
        )
    ).convert("RGBA")
    draw = ImageDraw.Draw(img)
    # 533 256
    for i, farm in enumerate(farms):
        pair = farm["pair"]
        logo0 = get_logo(pair.token0, 48)
        # 256 - 24 = 232
        img.paste(logo0, (555, 232 + (i * 130)), logo0)
        logo1 = get_logo(pair.token1, 48)
        img.paste(logo1, (599, 232 + (i * 130)), logo1)

        _, y = draw.textsize(pair.name, font=POPPINS_BOLD)
        draw.text(
            (670, (256-y//2) + (i * 130)),
            pair.name, 
            font=POPPINS_BOLD, 
            fill=(255, 255, 255, 255)
        )

        text = f"{farm['APR']}%"
        _, y = draw.textsize(text, font=POPPINS)
        draw.text(
            (950, (256-y//2) + (i * 130)),
            text, 
            font=POPPINS, 
            fill=(255, 255, 255, 255)
        )

    output = BytesIO()
    img.save(output, format="PNG")
    output.seek(0)
    return output
