# Pangolin Python Scripts

## holders
This directory contains scripts to get a daily average of token transfers, mint/burn of lp token/token2 and staking token

## others
This directory contains small scripts with various functions, see the [README](others/README.md) inside

## twitter_bot
This directory contains the code of pangolin twitter bot, see the [README](others/README.md) inside

## Run scripts w/ docker compose 
It is also possible to launch environment locally with a simple docker compose command. It allows also to run the scripts on development servers or on services running docker containers. 


To test locally: 

copy the example env vars 
```
cp .env.example .env
```

make sure .env has a valid project name ( "others" , "holders")

launch containers
```
docker compose up -d 
```

will build a python + required dbs environment for testing 

Now the container shell is accessible through docker: 
```
 docker exec -it pangopy-holders /bin/bash
```

and it is possible to run the different scripts available, once connected to the shell: 
```
python get_holders.py
```


## local mongodb

Mongodb database is accessible with any mongodb interface like compass https://www.mongodb.com/try/download/compass
The default set up is the following connection string: mongodb://admin:password@localhost:27017/?authSource=admin
