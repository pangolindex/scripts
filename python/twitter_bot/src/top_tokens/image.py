import os

from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

from src.constants.config import PATH_ABS
from src.utils.utils import human_format, get_logo, PATH_FONTS
from src.classes.types import TokenData


POPPINS = ImageFont.truetype(os.path.join(PATH_FONTS, "Poppins.ttf"), size=28)
POPPINS_20 = ImageFont.truetype(os.path.join(PATH_FONTS, "Poppins.ttf"), size=20)
POPPINS_BOLD = ImageFont.truetype(os.path.join(PATH_FONTS, "Poppins-Bold.ttf"), size=28)


def create_image(tokens: list[TokenData]) -> BytesIO:
    img = Image.open(
        os.path.join(
            PATH_ABS,
            "src/top_tokens/images/top_10_tokens.png"
        )
    ).convert("RGBA")
    draw = ImageDraw.Draw(img)

    # draw the first 3 tokens
    for i, tokenData in enumerate(tokens[:3]):
        # paste the token logo
        token = tokenData["token"] 
        logo = get_logo(token, 48)
        img.paste(logo, (110, 226 + i * 120), logo)

        text = f"{token.symbol}"
        _, y = draw.textsize(text, font=POPPINS_BOLD)
        draw.text(
            (170, 250-(y//2) + i * 120),
            text,
            font=POPPINS_BOLD,
            fill=(255, 255, 255, 255)
        )

        text2 = human_format(tokenData["volumeUSD"])
        _, y = draw.textsize(text2, font=POPPINS)
        draw.text(
            (500, 250-(y//2) + i * 120), 
            text2,
            font=POPPINS,
            fill=(255, 255, 255, 255)
        )

    # draw the rest of tokens
    for i, tokenData in enumerate(tokens[3:]):
        # paste the token logo
        token = tokenData["token"] 
        logo = get_logo(token, 48)
        img.paste(logo, (735, 200 + i * 50), logo)

        text = f"{token.symbol}"
        _, y = draw.textsize(text, font=POPPINS_20)
        draw.text(
            (790, (220-(y//2)) + i * 50),
            text,
            font=POPPINS_20,
            fill=(255, 255, 255, 255)
        )
        text2 = human_format(tokenData["volumeUSD"])
        _, y = draw.textsize(text2, font=POPPINS_20)
        draw.text(
            (1020, (220-(y//2)) + i * 50),
            text2,
            font=POPPINS_20,
            fill=(255, 255, 255, 255)
        )

    output = BytesIO()
    img.save(output, format="PNG")
    output.seek(0)
    return output
