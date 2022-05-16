import os

from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

from src.constants.config import PATH_ABS
from src.utils.utils import human_format, get_logo, PATH_FONTS
from src.classes.types import PairData


POPPINS = ImageFont.truetype(os.path.join(PATH_FONTS, "Poppins.ttf"), size=28)
POPPINS_20 = ImageFont.truetype(os.path.join(PATH_FONTS, "Poppins.ttf"), size=20)
POPPINS_BOLD = ImageFont.truetype(os.path.join(PATH_FONTS, "Poppins-Bold.ttf"), size=28)


def create_image(pairs: list[PairData]) -> BytesIO:
    img = Image.open(
        os.path.join(
            PATH_ABS,
            "src/top_pairs/images/top_10_pairs.png"
        )
    ).convert("RGBA")
    draw = ImageDraw.Draw(img)

    # draw the first 3 tokens
    for i, pair in enumerate(pairs[:3]):
        # paste the token logo
        token0 = pair["pair"].token0
        token1 = pair["pair"].token1
        logo0 = get_logo(token0, 48)
        # 48//2 = 24 -> 250-24 = 226
        img.paste(logo0, (105, 226 + i * 120), logo0)
        logo1 = get_logo(token1, 48)
        img.paste(logo1, (149, 226 + i * 120), logo1)

        text = f"{pair['pair'].name}"
        _, y = draw.textsize(text, font=POPPINS_BOLD)
        draw.text(
            (200, (250-(y//2)) + (i * 120)),
            text,
            font=POPPINS_BOLD,
            fill=(255, 255, 255, 255)
        )
        text2 = human_format(pair["volumeUSD"])
        _, y = draw.textsize(text2, font=POPPINS)
        draw.text(
            (500, (250-(y//2)) + (i * 120)), 
            text2,
            font=POPPINS,
            fill=(255, 255, 255, 255)
        )

    # draw the rest of tokens
    for i, pair in enumerate(pairs[3:]):
        # paste the token logo
        token0 = pair["pair"].token0
        token1 = pair["pair"].token1
        logo0 = get_logo(token0, 24)
        img.paste(logo0, (730, 212 + i * 50), logo0)
        logo1 = get_logo(token1, 24)
        img.paste(logo1, (750, 212 + i * 50), logo1)

        text = f"{pair['pair'].name}"
        _, y = draw.textsize(text, font=POPPINS_20)
        draw.text(
            (780, (200+(y//2)) + i * 50),
            text,
            font=POPPINS_20,
            fill=(255, 255, 255, 255)
        )
        text2 = human_format(pair["volumeUSD"])
        _, y = draw.textsize(text2, font=POPPINS_20)
        draw.text(
            (1020, (200+(y//2)) + i * 50),
            text2,
            font=POPPINS_20,
            fill=(255, 255, 255, 255)
        )

    output = BytesIO()
    img.save(output, format="PNG")
    output.seek(0)
    return output
