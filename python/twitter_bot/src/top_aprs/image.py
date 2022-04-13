import os

from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

from src.classes.token import Token
from src.utils.utils import human_format, get_logo, PATH_FONTS


POPPINS = ImageFont.truetype(os.path.join(PATH_FONTS, "Poppins.ttf"), size=24)
POPPINS_14 = ImageFont.truetype(os.path.join(PATH_FONTS, "Poppins.ttf"), size=14)
POPPINS_BOLD = ImageFont.truetype(os.path.join(PATH_FONTS, "Poppins-Bold.ttf"), size=28)

def super_farm_card() -> Image:
    img = Image.new('RGBA', (100, 40), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((0, 0, 100, 40), fill='#FFC800', radius=5)
    text = "Super Farm"
    w ,h = draw.textsize(text, POPPINS_14)
    draw.text(((100-w)/2, (40-h)//2), text, (0, 0, 0), font=POPPINS_14)
    return img

SUPERFARM = super_farm_card()

def create_card(farm: dict[str, any]) -> Image:
    card_img = Image.new('RGBA', (1160, 100), (0, 0, 0, 0))
    draw = ImageDraw.Draw(card_img)
    draw.rounded_rectangle((0, 0, 1160, 100), fill='#1C1C1C', radius=5)
    token0: Token = farm["token0"]
    token1: Token = farm["token1"]
    msg = f'{token0.symbol}-{token1.symbol}'
    _, h = draw.textsize(msg, POPPINS_BOLD)

    draw.text(
        xy=(121, (100-h)//2),
        text=msg,
        fill=(255, 255, 255),
        font=POPPINS_BOLD
    )
    logo0 = Image.open(get_logo(token0, 48)).convert("RGBA")
    logo1 = Image.open(get_logo(token1, 48)).convert("RGBA")
    card_img.paste(logo0, (10, 26), logo0)
    card_img.paste(logo1, (53, 26), logo1)

    text = f'TVL {human_format(farm["tvl"])}'
    _, h = draw.textsize(text, POPPINS)
    draw.text((400, (100-h)//2), text, (255, 255, 255), font=POPPINS)

    text = f'APR {farm["apr"]}%'
    w, h = draw.textsize(text, POPPINS)
    draw.text((1160-20-w, (100-h)//2), text, (255, 255, 255), font=POPPINS)

    if len(farm['rewards']) > 1:
        card_img.paste(SUPERFARM, (700, 30), SUPERFARM)

    return card_img


def create_image(farms: list[dict[str, any]]) -> BytesIO:
    num_lines = len(farms)
    HEIGHT = 100*(num_lines) + 20*(num_lines-1)+20+60
    img = Image.new('RGBA', (1200, HEIGHT), '#111111')
    draw = ImageDraw.Draw(img)
    text = f"Top {num_lines} farms on Pangolin by apr."
    w, _ = draw.textsize(text, POPPINS)
    draw.text(((1200-w)/2, 20), text, (255, 255, 255), font=POPPINS)
    for i in range(num_lines):
        card = create_card(farms[i])
        y = 100*i + 20*i + 60
        img.paste(card, (20, y), card)

    output = BytesIO()
    img.save(output, format="PNG")
    img.show()
    output.seek(0)
    return output
