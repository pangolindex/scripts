from json import dumps
from uuid import NAMESPACE_DNS, uuid5

from src.airdrop import get_config_from_file

airdrop_config = get_config_from_file()
airdrop_config.pop("id") # Remove the old id
airdrop_id = str(uuid5(NAMESPACE_DNS, dumps(airdrop_config, sort_keys=True)))
print("Airdrop id: ", airdrop_id)