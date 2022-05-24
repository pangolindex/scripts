from src.classes.token import Token

# Blacklisted tokens
AXLUSDT = Token("0x260bbf5698121eb85e7a74f2e45e16ce762ebe11", " Axelar Wrapped USDT", "axlUST")
UST = Token("0xb599c3590f42f8f995ecfa0f85d2980b76862fc1", "Wormhole UST", "UST")
AXLLUNA = Token("0x120ad3e5a7c796349e591f1570d9f7980f4ea9cb", "Axelar Wrapped Luna", "Luna")
LUNA = Token("0x70928E5B188def72817b7775F0BF6325968e563B", "Wormhole Luna", "Luna")

BLACKLIST = [
    AXLUSDT,
    UST,
    AXLLUNA,
    LUNA,
]