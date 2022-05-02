from src.classes.token import Token
from src.constants.tokens import WAVAX

def is_avax(token: Token) -> bool:
    """Return if the token address is wavax
    --------------------------------
    Args:
        address (str): Adress of token
    --------------------------------
    Returns:
        bool: True if the token is wavax
    """
    return token == WAVAX
