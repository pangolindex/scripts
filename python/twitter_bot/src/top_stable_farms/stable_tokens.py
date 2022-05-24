from src.classes.pair import Pair
from src.classes.token import Token

USDC = Token("0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e", "USD Coin", "USDC")
USDCE = Token("0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664", "USD Coin", "USDC.e")
DAI = Token("0xd586e7f844cea2f87f50152665bcbc2c279d8d70", "Dai Stablecoin", "DAI.e")
USDT = Token("0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7", "Tether USD", "USDT")
USDTE = Token("0xc7198437980c041c805a1edcba50c1ce5db95118", "Tether USD", "USDT.e")

# Stable pairs existing
USDCE_USDC = Pair("0x8a9c36bc3ced5ecce703a4da8032218dfe72fe86", USDCE, USDC)
USDCE_DAI = Pair("0x221caccd55f16b5176e14c0e9dbaf9c6807c83c9", USDCE, DAI)
USDCE_USDTE = Pair("0xc13e562d92f7527c4389cd29c67dabb0667863ea", USDCE, USDTE)

STABLE_PAIRS = [
    USDCE_USDC,
    USDCE_DAI,
    USDCE_USDTE,
]
