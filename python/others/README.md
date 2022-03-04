# Others Scripts

## Install

### Create Python [Environment](https://docs.python.org/3/tutorial/venv.html)
`python -m venv env`

### Active Environment 

#### On Linux / Mac
Run the command bellow:

`source <path to env>/env/bin/activate`

#### On Windows
Run the command bellow:

`<path to env>\env\Scripts\activate.bat`

### Install libs / packages 

`pip3 install -r requirements.txt`

# block_by_date.py
This script get block by date

![Image 3](https://i.imgur.com/dR992GT.png)

## Run 
`python block_by_date.py`

# get_png_pools.py
This script get all pools with PNG as pair and save in [pools.json](src/constants/pools.json)

## Run 
`python get_png_pools.py`

# swap_fee.py
This script generates swap fee chart and exports to a CSV

## Run 
`python swap_fee.py`

## View
You can see in the browser, the URL will be available on the console

In this case it is http://127.0.0.1:8050/

![Image 4](https://i.imgur.com/InLxbLj.png)

![Image 5](https://i.imgur.com/ERuKrrC.png)
