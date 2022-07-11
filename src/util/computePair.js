const Helpers = require('../core/helpers');

// Change These Variables
// --------------------------------------------------
const tokenA = '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7';
const tokenB = '0xf20d962a6c8f70c731bd838a3a388d7d48fa6e15';
// --------------------------------------------------

console.log(Helpers.getPair(tokenA, tokenB));
