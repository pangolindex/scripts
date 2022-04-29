import os

from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

from src.constants.config import PATH_ABS
from src.utils.utils import human_format, get_logo, PATH_FONTS
from src.classes.types import TokenData


POPPINS = ImageFont.truetype(os.path.join(PATH_FONTS, "Poppins.ttf"), size=28)
POPPINS_BOLD = ImageFont.truetype(os.path.join(PATH_FONTS, "Poppins-Bold.ttf"), size=28)
POPPINS_BOLD_20 = ImageFont.truetype(os.path.join(PATH_FONTS, "Poppins-Bold.ttf"), size=20)


def create_image_5(tokensData: list[TokenData]) -> BytesIO:
    background = Image.open(
        os.path.join(
            f"{PATH_ABS}/src/top_gamefi/images", "template_top5.png"
        )
    )
    draw = ImageDraw.Draw(background)
    # 530 220
    # 80
    space = 80
    for i, data in enumerate(tokensData):
        if i > 1:
            space = 83
        # paste the token logo
        token = data["token"]
        logo = get_logo(token, 48)
        background.paste(logo, (550, 196 + i * space), logo)

        # draw the token name
        text = f"{token.symbol}"
        _, y = draw.textsize(text, font=POPPINS_BOLD)
        draw.text(
            (610, (220-(y//2)) + i * space), 
            text,
            font=POPPINS_BOLD,
            fill=(255, 255, 255, 255)
        )

        # draw the token volume
        text = f"{human_format(data['volumeUSD'])} $"
        _, y = draw.textsize(text, font=POPPINS)
        draw.text(
            (810, (220-(y//2)) + i * space), 
            text,
            font=POPPINS,
            fill=(255, 255, 255, 255)
        )
        
    output = BytesIO()
    background.save(output, format="PNG")
    output.seek(0)
    background.show()
    return output


def create_image_10(tokensData: list[TokenData]) -> BytesIO:
    background = Image.open(
        os.path.join(
            f"{PATH_ABS}/src/top_gamefi/images", "template_top10.png"
        )
    )
    draw = ImageDraw.Draw(background)

    # paste first token
    token = tokensData[0]["token"]
    logo = get_logo(token, 140)
    x, y = logo.size
    background.paste(logo, (160-(x//2), 390-(y//2)), logo)

    text = f"1°  {token.symbol}"
    x, y = draw.textsize(text, font=POPPINS_BOLD)
    draw.text(
        (160-(x//2), (510-(y//2))), 
        text,
        font=POPPINS_BOLD,
        fill="#e9ab00"
    )

    # paste second token
    token = tokensData[1]["token"]
    logo = get_logo(token, 120)
    x, y = logo.size
    background.paste(logo, (416-(x//2), 395-(y//2)), logo)

    text = f"2°  {token.symbol}"
    x, y = draw.textsize(text, font=POPPINS_BOLD)
    draw.text(
        (415-(x//2), (490-(y//2))), 
        text,
        font=POPPINS_BOLD,
        fill="#6e6e6e"
    )

    # paste third token
    token = tokensData[2]["token"]
    logo = get_logo(token, 90)
    x, y = logo.size
    background.paste(logo, (643-(x//2), 395-(y//2)), logo)

    text = f"3°  {token.symbol}"
    x, y = draw.textsize(text, font=POPPINS_BOLD)
    draw.text(
        (643-(x//2), (480-(y//2))), 
        text,
        font=POPPINS_BOLD,
        fill="#a77d51"
    )

    # paste the rest of tokens
    for i, date in enumerate(tokensData[3:]):
        token = date["token"]
        logo = get_logo(token, 48)
        background.paste(logo, (835, 216 + i * 50), logo)
        _, y = draw.textsize(token.symbol, font=POPPINS_BOLD_20)
        draw.text(
            (890, (240-(y//2) + i * 50)), 
            token.symbol,
            font=POPPINS_BOLD_20,
            fill=(255, 255, 255, 255)
        )

    output = BytesIO()
    background.save(output, format="PNG")
    output.seek(0)
    background.show()
    return output

def create_image(tokensData: list[TokenData]) -> BytesIO:
    if len(tokensData) == 5 :
        return create_image_5(tokensData)
    elif len(tokensData) == 10:
        return create_image_10(tokensData)
