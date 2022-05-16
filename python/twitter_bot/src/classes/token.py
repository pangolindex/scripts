from eth_utils import to_checksum_address

class Token:
    def __init__(self, address: str, name: str = None, symbol: str = None, logo: str = None):
        self.name = name
        self.symbol = symbol
        self.address = to_checksum_address(address)
        self._logo = logo

        self.convert()

    def logo(self, size: int | None = None):
        if self._logo:
            return self._logo

        url = f"https://raw.githubusercontent.com/pangolindex/tokens/main/assets/{self.address}/"
        url += f"logo_{size}.png" if size else "logo.png"
        return url

    def convert(self):
        if self.address == "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7":
            self.symbol = "AVAX"
        elif self.address == "0x260Bbf5698121EB85e7a74f2E45E16Ce762EbE11": #axlUST
            self.symbol = "axlUST"

    def __eq__(self, other_token: object) -> bool:
        return other_token.address == self.address
