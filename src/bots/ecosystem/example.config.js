/**
 * Ecosystem configuration used by pm2 (https://pm2.io/)
 */
const config = [
  {
    name: 'vester',
    script: './vesterBotEVM.js',
    env: {
      WALLET: '',
      KEY: '',
      RPC: 'https://api.avax.network/ext/bc/C/rpc',
      TREASURY_VESTER: '0x6747AC215dAFfeE03a42F49FebB6ab448E12acEe',
      TREASURY_VESTER_PROXY: '0x503C4e38c80B1D17e2c653E142770CeA060a8bB7',
      LOW_BALANCE_THRESHOLD: '1000000000000000000',
      DISCORD_ENABLED: false,
      DISCORD_TOKEN: '',
      DISCORD_CHANNEL_ID: '',
      DISCORD_CHAIN_ID: '43114',
    },
  },
  {
    name: 'buyback',
    script: './buybackBot.js',
    env: {
      WALLET: '',
      KEY: '',
      RPC: 'https://api.avax.network/ext/bc/C/rpc',
      FEE_COLLECTOR: '0xAc61FD938E762357eEe739EB30938783366f43a7',
      ROUTER: '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106',
      SUBGRAPH: 'https://api.thegraph.com/subgraphs/name/pangolindex/exchange',
      WRAPPED_NATIVE_CURRENCY: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
      PNG: '0x60781C2586D68229fde47564546784ab3fACA982',
      SLIPPAGE_BIPS: 250,
      MAX_GAS: 7000000,
      INTERVAL: 48 * 60 * 60 * 1000,
      INTERVAL_WINDOW: 6 * 60 * 60 * 1000,
      LOW_BALANCE_THRESHOLD: '1000000000000000000',
      DISCORD_ENABLED: false,
      DISCORD_TOKEN: '',
      DISCORD_CHANNEL_ID: '',
      DISCORD_CHAIN_ID: '43114',
    },
  },
];


// Post-processing to provide uniqueness
const path = require('node:path');
const ECOSYSTEM = path.basename(__filename, '.config.js');
const apps = config.map(app => ({
  ...app,
  name: `${ECOSYSTEM}/${app.name}`,
  namespace: ECOSYSTEM,
  time: true,
  log_file: `logs/${ECOSYSTEM}-${app.name}.log`,
  autorestart: false,
}));

module.exports = { apps };
