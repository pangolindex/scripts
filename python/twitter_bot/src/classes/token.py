from eth_utils import to_checksum_address

class Token:
    def __init__(self, address: str, name: str = None, symbol: str = None):
        self.name = name
        self.symbol = symbol
        self.address = to_checksum_address(address)
    
    def logo(self, size: int | None):
        url = f"https://raw.githubusercontent.com/pangolindex/tokens/main/assets/{self.address}/"
        url += f"logo_{size}.png" if size else "logo.png"
        return url
