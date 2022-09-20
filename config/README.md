# Configuration

Some functionality requires sensitive information like your wallet address or private key. 
This information should be provided via a `config.js` file following the template provided 
in the `config.example.js` file. Copy the example template and rename it to `config.js`


### Overriding or specifying information via text

The recommended `config.js` setup will utilize two environment variables 
`WALLET_ADDRESS` and `WALLET_KEY` by default, but also supports overriding 
or specifying this information via dotenv or directly in the `config.js` file like so:

1) Replace `process.env.WALLET_ADDRESS` with your wallet address wrapped in quotes
2) Replace `process.env.WALLET_KEY` with your private key wrapped in quotes

The following is an example of what an overridden `config.js` file might look like:
```js
module.exports = {

    WALLET: {
        ADDRESS: '0x93f4B6D7C1f2702A9c5d8219d86a93a12075F2c7',
        KEY: 'ce136b12cc3a2e3b5ecd2ab217b23a09f9512ced50abb121bea394e8bcd3b40b'
    },
  
    RPC: 'https://api.avax.network/ext/bc/C/rpc'

}
```
