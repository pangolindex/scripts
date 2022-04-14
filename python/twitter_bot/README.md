# Pangolin Twitter bot

This is the bot of [Pangolin Aprs](https://twitter.com/PangolinAPRs) account.

You need to get api keys in [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard) and if you want to upload images, you will need to request [elevated access](https://developer.twitter.com/en/portal/products/elevated).

This bot has the following functions:
- **Tweet the top farms** of pangolin farms, every 1 day, with variations: top 5 super farms by apr, top 10 farms and super farms by tvl, etc

## To add a new function
You can create a folder inside [src](src/) folder and add your logic inside it, then you will need to import your logic in [main.py](main.py) and set the time that this code will be executed again.

### Example:
Adding a code that will tweet Pangolin Best Dex every 1 hour, i'm going to create a folder called "best_dex" with a main.py file containing the following code:
```python
# in src/best_dex/main.py
from tweepy import API, Client

def main(client: Client, api: API, user: dict[str, any]) -> None:
    response = client.create_tweet(text="Pangolin is the best dex", user_auth= True)
    tweet_data = response.data
    print(f"New best dex tweet: \nhttps://twitter.com/{user['username']}/status/{tweet_data['id']}")
```
Now we need to import this function into [main.py](main.py) and add the worker that will run this task at a given time 
```python
# in main.py
# ...
from src.best_dex.main import main as best_dex # rename function to best_dex
# ...
    tasks = []
    try:
        top_farms_task = BackgroundWorker(top_farms_period, top_farms, client, api, user)
        tasks.append(top_farms_task)
        #BackgroundWorker(interval, function, args of function)
        best_dex_task = BackgroundWorker(1*60*60, best_dex, client, api, user) 
        tasks.append(best_dex_task)
    except KeyboardInterrupt:
    # ...
```

## Install

### **Create Python** [Environment](https://docs.python.org/3/tutorial/venv.html) (Optional)
`python -m venv env`

### Active Environment 

#### On Linux / Mac
Run the command bellow:

`source <path to env>/env/bin/activate`

#### On Windows
Run the command bellow:

`<path to env>\env\Scripts\activate.bat`

### **Install libs / packages / modules**

`pip3 install -r requirements.txt`

## Config
Copy the [config_bot_example.ini](config_example.ini) to **config_bot.ini** and edit items of section called [Twitter] to add your apis keys provided by twitter.

![Image 1](https://i.imgur.com/CxqW7zg.png)

## Run
`python main.py`
