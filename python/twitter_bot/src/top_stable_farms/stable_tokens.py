from src.classes.pair import Pair
from src.classes.token import Token

USDC = Token("0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e", "USD Coin", "USDC")
USDCE = Token("0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664", "USD Coin", "USDC.e")
DAI = Token("0xd586e7f844cea2f87f50152665bcbc2c279d8d70", "Dai Stablecoin", "DAI.e")
AXLUSDT = Token("0x260bbf5698121eb85e7a74f2e45e16ce762ebe11", " Axelar Wrapped USDT", "axlUST")
UST = Token("0xb599c3590f42f8f995ecfa0f85d2980b76862fc1", "Wormhole UST", "UST")
USDT = Token("0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7", "Tether USD", "USDT")
USDTE = Token("0xc7198437980c041c805a1edcba50c1ce5db95118", "Tether USD", "USDT.e")
JPYC = Token("0x431d5dff03120afa4bdf332c61a6e1766ef37bdb", "Japanese Yen Coin", "JPYC")

# Stable pairs existing
AXLUSDT_USDC = Pair("0x3c0ecf5f430bbe6b16a8911cb25d898ef20805cf", AXLUSDT, USDC)
USDC_UST = Pair("0xe1f75e2e74ba938abd6c3be18ccc5c7f71925c4b", USDC, UST)
USDCE_USDC = Pair("0x8a9c36bc3ced5ecce703a4da8032218dfe72fe86", USDCE, USDC)
USDCE_DAI = Pair("0x221caccd55f16b5176e14c0e9dbaf9c6807c83c9", USDCE, DAI)
USDCE_USDTE = Pair("0xc13e562d92f7527c4389cd29c67dabb0667863ea", USDCE, USDTE)
USDC_JPYC = Pair("0xcebac1656ba67b76551d8747f0249e0d2b5c459d", USDC, JPYC)

STABLE_PAIRS = [
    AXLUSDT_USDC,
    USDC_UST,
    USDCE_USDC,
    USDCE_DAI,
    USDCE_USDTE,
    USDC_JPYC
]
