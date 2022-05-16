from os import path

from src.constants.config import PATH_ABS


class Variation:
    def __init__(
        self,
        number_tokens=10
    ):
        """Constructor for Variation class.
        Args:
            number_farms (int, optional): Number of top tokens. Defaults to 10.
        """
        self.number_tokens = number_tokens


TOP_5_TOKENS = Variation(5)
TOP_10_TOKENS = Variation(10)

VARIATIONS = [
    TOP_5_TOKENS,
    TOP_10_TOKENS,
]


def get_last_variation() -> int:
    with open(path.join(PATH_ABS, "src/top_gamefi/last_variation"), "r") as f:
        variation = int(f.read())
        if variation > len(VARIATIONS) - 1:
            variation = 0
        return variation


def set_last_variation(variation: int):
    with open(path.join(PATH_ABS, "src/top_gamefi/last_variation"), "w") as f:
        f.write(str(variation))
