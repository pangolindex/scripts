import subprocess
import re

from configparser import RawConfigParser
from InquirerPy import inquirer, prompt
from InquirerPy.base.control import Choice
from InquirerPy.separator import Separator
from InquirerPy.validator import EmptyInputValidator
from json import dumps, load, loads
from json.decoder import JSONDecodeError
from os import listdir
from os.path import join, isfile
from uuid import NAMESPACE_DNS, uuid5
from web3 import Web3, HTTPProvider
from web3.middleware import geth_poa_middleware

from src.constants.main import PATH_ABS, AIRDROP_CATEGORIES
from src.utils.validate import validate_addres, validate_url

PATH_CHAINS = join(PATH_ABS, "src/constants/chains.json")
PATH_AIRDROPS_CONFIG = join(PATH_ABS, "airdrops")

def get_git_revision_hash() -> str:
    return subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode('ascii').strip()

def update_chains(chains: dict[str, any]) -> None:
    with open(PATH_CHAINS, 'w') as file:
        file.write(dumps(chains, indent=4))

def get_chains():
    with open(PATH_CHAINS) as file:
        chains = load(file)
    return chains

def get_multiple_addresses(message: str) -> list[str]:
    questions = [
        {
            "type": "input",
            "name": "address",
            "message": f"Insert the {message} address:",
            "validate": validate_addres
        },
        {
            "type": "confirm",
            "name": "more",
            "message": f"Add more {message}?",
            "default": False
        },
    ]

    answers = prompt(questions)
    
    addresses = [answers["address"]]
    
    while answers["more"]:
        answers = prompt(questions)
        addresses.append(answers["address"])

    return addresses

def get_blocks(w3: Web3) -> tuple[int, int]:
    start_block = inquirer.number(
        message="Insert the start block to track:",
        validate=EmptyInputValidator()
    ).execute()
    
    def validate_last_block(value: str | int):
        return value == "" or start_block < value
            
    last_block = inquirer.number(
        message="Insert the last block to track (Empty for latest block):",
        validate=validate_last_block,
    ).execute()

    if last_block == "":
        last_block = w3.eth.get_block("latest")["number"]
        print(f"latest block: {last_block}")
    
    return start_block, last_block

def get_config_from_file(file: str = None) -> dict[str, any]:
    files = [f for f in listdir(PATH_AIRDROPS_CONFIG) if isfile(join(PATH_AIRDROPS_CONFIG, f))]
    if file is None:
        DEFAULT_FILE = "png_holders_1.ini"
        file = inquirer.select(
            message="Select config file",
            choices=files,
            default=DEFAULT_FILE,
        ).execute()

    config_file = RawConfigParser()
    config_file.read(join(PATH_AIRDROPS_CONFIG, file))

    config = {
        "id": config_file["airdrop"]["id"],
        "name": config_file["airdrop"]["name"],
        "unit": config_file["airdrop"]["unit"]
    }
    
    chains = get_chains()

    name = config_file["blockchain"]["blockchain"]

    chain = chains[name]
    dex = config_file["blockchain"]["dex"]
    dexs = loads(dex)
    
    for dex in list(chain["dex"].keys()):
        if dex not in dexs:
            del chain["dex"][dex]

    chain["name"] = name        
    config["blockchain"] = chain
    
    for category in AIRDROP_CATEGORIES:
        if category in config_file.sections():
            try:
                address = loads(config_file[category]["address"]) # if not a list, is address
            except JSONDecodeError:
                address = config_file[category]["address"]
            config[category] = {
                "address": address,
                "start_block": config_file.getint(category, "start_block"),
                "last_block": config_file.getint(category, "last_block"),
            }

    return config

def save_config_to_file(config: dict[str, any]) -> None:
    config_name = inquirer.text(
        message="Insert name of this airdrop config:",
        validate=EmptyInputValidator()
    ).execute()

    config_file = RawConfigParser()

    config_file.add_section("airdrop")
    config_file.set('airdrop', 'id', config["id"])
    config_file.set('airdrop', 'name', config_name)
    config_file.set('airdrop', 'commit_id', get_git_revision_hash())
    config_file.set('airdrop', 'unit', config["unit"])

    config_file.add_section("blockchain")
    config_file.set("blockchain", "blockchain", config["blockchain"]["name"])
    dexs = dumps(list(config["blockchain"]["dex"].keys()))
    config_file.set("blockchain", "dex", dexs)

    for section in AIRDROP_CATEGORIES:
        if section in config:
            address = config[section]["address"]
            address = dumps(address) if isinstance(config[section]["address"], list) else address
            config_file.add_section(section)
            config_file.set(section, "address", address)
            config_file.set(section, "start_block", config[section]["start_block"])
            config_file.set(section, "last_block", config[section]["last_block"])
            
    file_name = re.sub("\s+", "_", config_name)
    path = join(PATH_AIRDROPS_CONFIG, f"{file_name}.ini")
    with open(path, 'w') as file:
        config_file.write(file)

    print(f"Airdrop config saved in {path}")

def create_airdrop_config() -> dict[str, any]:
    print("Creating new airdrop config")

    chains = get_chains()

    choices = [Choice(None, name="Add new chain"), Separator()]
    choices.extend(list(chains.keys()))

    chain_name = inquirer.select(
        message="Select chain or add new chain:",
        choices=choices,
        default='AVAX',
    ).execute()

    if chain_name is None:
        selected_chain = create_chain()
        chains.update(selected_chain)
        chain_name = list(selected_chain.keys())[0]

        update_chains(chains)

    selected_chain = chains[chain_name]

    add_new_dex = inquirer.confirm(
        message="Add new Dex?",
        default=False
    ).execute()

    if add_new_dex:
        print("Adding new dex")
        new_dexs = add_dex()
        selected_chain['dex'].update(new_dexs)
        chains[chain_name] = selected_chain
        update_chains(chains)

    choices = list(selected_chain['dex'].keys())

    dexs_names = inquirer.select(
        message="Select multiple DEXs (use space to select various):",
        choices=choices,
        multiselect=True,
    ).execute()

    for dex in list(selected_chain["dex"].keys()):
        if dex not in dexs_names:
            selected_chain["dex"].pop(dex)

    selected_chain["name"] = chain_name
    config = {"blockchain": selected_chain}
    w3 = Web3(HTTPProvider(selected_chain["rpc"]))
    w3.middleware_onion.inject(geth_poa_middleware, layer=0)

    track_transfers = inquirer.confirm(
        message="Track token transfers?",
        default=False
    ).execute()
    if track_transfers:
        token_address = inquirer.text(
            message="Insert the token address:",
            validate=validate_addres
        ).execute()

        start_block, last_block = get_blocks(w3)

        config["transfers"] = {
            "address": token_address,
            "start_block": start_block,
            "last_block": last_block
        }

    track_lp = inquirer.confirm(
        message="Track LP token (Mint/Burn Events)?",
        default=False
    ).execute()
    if track_lp:
        addresses = get_multiple_addresses("LP token")

        start_block, last_block = get_blocks(w3)

        config["lp"] = {
            "address": addresses,
            "start_block": start_block,
            "last_block": last_block
        }

    track_staking = inquirer.confirm(
        message="Track Staking Contracts?",
        default=False
    ).execute()
    if track_staking:
        addresses = get_multiple_addresses("Staking contract")

        start_block, last_block = get_blocks(w3)

        config["stake"] = {
            "address": addresses,
            "start_block": start_block,
            "last_block": last_block
        }

    unit = inquirer.select(
        message="Select the unit of amount:",
        choices=["ether", "gwei", "wei"],
        default='ether',
    ).execute()
    config["unit"] = unit

    config["id"] = str(uuid5(NAMESPACE_DNS, dumps(config, sort_keys=True)))
    print("Airdrop Config:")
    print(dumps(config, indent=4, sort_keys=True))
    
    save = inquirer.confirm(
        message="Save this airdrop config in file?",
        default=True,
    ).execute()
    
    if save:
        save_config_to_file(config)
    
    return config

def create_chain() -> dict[str, any]:
    name = inquirer.text(
        message="Insert the chain name:",
        validate=EmptyInputValidator()
    ).execute()
    rpc = inquirer.text(
        message="Insert the rpc url:",
        validate=validate_url
    ).execute()
    testnet = inquirer.confirm(
        message="Is testnet?",
        default=False,
    ).execute()

    name = f"{name}_testnet" if testnet else name
    chain = {name: {}}
    chain[name]['rpc'] = rpc

    print("Insert one dex")
    dex = add_dex()

    chain[name]['dex'] = dex
    return chain

def add_dex() -> dict[str, any]:
    questions = [
        {
            "type": "input",
            "name": "name",
            "message": "Insert the dex name:",
            "validate": EmptyInputValidator()
        },
        {
            "type": "input",
            "name": "factory",
            "message": "Insert the factory address:",
            "validate": validate_addres
        },
        {
            "type": "confirm",
            "name": "more_dex",
            "message": "Add more dex?",
        },
    ]

    answers = prompt(questions)

    dex = {answers["name"]: {"factory": answers["factory"]}}
    while answers['more_dex']:
        answers = prompt(questions)

        dex[answers["name"]] = {
            "factory": answers["factory"]
        }

    return dex
