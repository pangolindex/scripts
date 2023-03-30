# Pangolin Bots

This directory contains a collection of Pangolin bots used to perform regular operations. 
They are configured via environment variables and are presented to be easily run by the process manager [pm2](https://pm2.io/).


## Setup

### Install dependencies
```bash
cd src/bots
npm install
npm install -g pm2
```


## Ecosystem Configuration
1) Navigate to `src/bots/ecosystem` directory
2) Copy `example.config.js` example config file and rename `example` to your ecosystem name
   ```bash
   cp example.config.js avalanche.config.js
   ```
3) Complete missing variables `WALLET`, `KEY`, etc.
4) Modify other variables as desired


## Management

### Starting All Bots
```bash
pm2 start ecosystem/avalanche.config.js
```

### Running Some Bots
```bash
pm2 start ecosystem/avalanche.config.js --only "avalanche/vester"
```

### Viewing Bot Logs
```bash
pm2 logs -f avalanche
```
