import math, os, requests

from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

from src.constants.config import PATH_ABS

PATH_DATA = os.path.join(PATH_ABS, "src/top_aprs/data")
PATH_FONT = os.path.join(PATH_DATA, "fonts/Poppins.ttf")
PATH_IMAGE = os.path.join(PATH_DATA, "images")

FONT = ImageFont.truetype(PATH_FONT, size=24)
FONT_16 = ImageFont.truetype(PATH_FONT, size=16)

def is_avax(address: str) -> bool:
    return address.lower() == "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7"

def human_format(num: float | int) -> str:
    magnitude = 0
    while abs(num) >= 1000:
        magnitude += 1
        num /= 1000

    magnitude = min(magnitude, 5)
    letter = ['', 'K', 'M', 'G', 'T', 'P'][magnitude]
    return f'{num:.2f}{letter}'

def get_logo(address: str, size: int | None) -> BytesIO | str:
    if is_avax(address):
        name = f"avax_{size}.png" if size else "avax.png"
        return os.path.join(PATH_IMAGE, name)

    request_url = f"https://raw.githubusercontent.com/pangolindex/tokens/main/assets/{address}/"
    request_url += f"logo_{size}.png" if size else "logo.png"

    response = requests.get(request_url)

    if response.status_code == 200:
        return BytesIO(response.content)

    request_url = "https://raw.githubusercontent.com/pangolindex/tokens/main/assets/0x60781C2586D68229fde47564546784ab3fACA982/"
    request_url += f"logo_{size}.png" if size else "logo.png"

    response = requests.get(request_url)

    return BytesIO(response.content)

def create_card(farm: dict[str, any]) -> Image:
    card_img = Image.new('RGBA', (528, 190), (0, 0, 0, 0))
    draw = ImageDraw.Draw(card_img)
    draw.rounded_rectangle((0, 0, 528, 190), fill='#212427', radius=10)
    draw.text(
        (20, 20),
        f'{farm["token0"]["symbol"]}-{farm["token1"]["symbol"]}',
        (255, 255, 255),
        font=FONT
    )
    logo0 = Image.open(get_logo(farm["token0"]["address"], 48)).convert("RGBA")
    logo1 = Image.open(get_logo(farm["token1"]["address"], 48)).convert("RGBA")
    card_img.paste(logo0, (417, 20), logo0)
    card_img.paste(logo1, (460, 20), logo1)
    
    draw.line((20, 80, 508, 80), fill=(44, 45, 51), width=1)

    draw.text((20, 110), "TVL", (255, 255, 255), font=FONT_16)
    draw.text((20, 130), f'{human_format(farm["tvl"])}', (255, 255, 255), font=FONT)
    draw.text((194, 110), "APR", (255, 255, 255), font=FONT_16)
    draw.text((194, 130), f'{farm["apr"]}%', (255, 255, 255), font=FONT)

    draw.text((354, 110), "Rewards in", (255, 255, 255), font=FONT_16)
    start_reward_position = 354
    for reward in farm['rewards']:
        reward_logo = Image.open(get_logo(reward, 24)).convert("RGBA")
        card_img.paste(reward_logo, (start_reward_position, 137), reward_logo)
        start_reward_position += 20

    if len(farm['rewards']) > 1:
        superfarm = Image.open(os.path.join(PATH_IMAGE, "superfarm.png")).convert("RGBA")
        card_img.paste(superfarm, (20, 52), superfarm)

    return card_img
    

def create_image(farms: list[dict[str, any]]) -> BytesIO:
    num_lines = math.ceil(len(farms)/2)
    HEIGHT = 190*(num_lines) + 20*(num_lines-1)+40
    img = Image.new('RGBA', (1116, HEIGHT), '#111111')
    
    num_lines = math.ceil(len(farms)/2)
    actual_farm = 0
    for i in range(num_lines):
        for j in range(2):
            card = create_card(farms[actual_farm])
            y = 190*i + 20*i + 20
            x = 528*j + 20*j + 20
            img.paste(card , (x, y), card)
            actual_farm += 1

    output = BytesIO()
    img.show()
    img.save(output, format="PNG")
    return output
