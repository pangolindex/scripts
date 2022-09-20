const Helper = require('../core/helpers');

// Change These Variables
// ---------------------------------------------------------------
const message = 'This is the message';
// ---------------------------------------------------------------


const hash = Helper.keccak256(message);
console.log(hash);
