# Configuration

Some functionality requires sensitive information like your wallet address or private key. 
This information should be provided via the `./config/config.js` file following the template provided 
in the `./config/config.example.js` file:

1) Copy or rename `config.example.js` to `config.js`
2) Replace the `ADDRESS` value with your wallet address
3) Replace `KEY` value with your private key

The following is an example of what your `config.js` file might look like:
```js
const Config = {

    WALLET: {
        ADDRESS: '0x93f4B6D7C1f2702A9c5d8219d86a93a12075F2c7',
        KEY: 'ce136b12cc3a2e3b5ecd2ab217b23a09f9512ced50abb121bea394e8bcd3b40b'
    },

};

module.exports = Config;
```
