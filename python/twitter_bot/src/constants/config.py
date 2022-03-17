import json, os

PATH_ABS = os.path.abspath('.')

if os.environ.get('CONF_PATH') is None:
    CONF_PATH = "../../config"
else:
    CONF_PATH = os.environ.get('CONF_PATH')

PATH_CONF = os.path.join(PATH_ABS , CONF_PATH)

with open(os.path.join(PATH_CONF, "abi.json")) as file:
    ABIS = json.load(file)

with open(os.path.join(PATH_CONF, "address.json")) as file:
    ADRESSES = json.load(file)
    