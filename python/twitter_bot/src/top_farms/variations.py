from os import path

from src.constants.config import PATH_ABS

class Variation:
    def __init__(
        self,
        only_super_farms = False,
        only_farms = False,
        order_by = "APR",
        number_farms = 10
    ):
        """Constructor for Variation class.

        Args:
            only_super_farms (bool, optional): Show only super farms. Defaults to False.
            only_farms (bool, optional): Show only farms (only with PNG as reward). Defaults to False.
            order_by (str, optional): Order of farms, volume, apr or tvl. Defaults to "APR".
            number_farms (int, optional): Number of top farms. Defaults to 10.
        """
        self.only_super_farms = only_super_farms
        self.only_farms = only_farms
        self.order_by = order_by
        self.number_farms = number_farms
        
    def text(self):
        farm_text = "super farms" if self.only_super_farms else "farms" if self.only_farms else "farms and super farms"
        return f"Top {self.number_farms} {farm_text} on @pangolindex by {self.order_by}."
    
    def img_text(self):
        farm_text = "super farms" if self.only_super_farms else "farms" if self.only_farms else "farms and super farms"
        return f"Top {self.number_farms} {farm_text} on Pangolin by {self.order_by}."

TOP_10_APR = Variation() # Top 10 farms and super farms by apr
TOP_10_TVL = Variation(order_by="tvl") # Top 10 farms and super farms by tvl
TOP_10_VOLUME = Variation(order_by="volume") # Top 10 farms and super farms by volume
TOP_10_SUPER_FARMS = Variation(only_super_farms=True) # Top 10 super farms by apr
TOP_5_SUPER_FARMS = Variation(only_super_farms=True, number_farms=5) # Top 5 super farms by apr
TOP_10_SUPER_FARMS_TVL = Variation(only_super_farms=True, order_by="TVL") # Top 10 super farms by tvl
TOP_10_FARMS = Variation(only_farms=True) # Top 10 farms by apr
TOP_5_FARMS = Variation(only_farms=True, number_farms=5) # Top 5 farms by apr
TOP_5_SUPER_FARMS_VOLUME = Variation(only_super_farms=True, order_by="volume", number_farms=5) # Top 5 super farms by volume
TOP_5_FARMS_VOLUME = Variation(only_farms=True, order_by="volume", number_farms=5) # Top 5 farms by volume

VARIATIONS = [
    TOP_10_APR,
    TOP_10_SUPER_FARMS,
    TOP_10_FARMS,
    TOP_10_TVL,
    TOP_5_SUPER_FARMS,
    TOP_5_FARMS,
    TOP_10_VOLUME,
    TOP_10_SUPER_FARMS_TVL,
    TOP_5_FARMS_VOLUME,
    TOP_5_SUPER_FARMS_VOLUME,
]


def get_last_variation() -> int:
    with open(path.join(PATH_ABS, "src/top_farms/last_variation.txt"), "r") as f:
        variation = int(f.read())
        if variation > len(VARIATIONS) - 1:
            variation = 0
        return variation 


def set_last_variation(variation: int):
    with open(path.join(PATH_ABS, "src/top_farms/last_variation.txt"), "w") as f:
        f.write(str(variation))
