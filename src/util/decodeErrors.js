const Web3 = require('web3');
const web3 = new Web3();

// Change These Variables
// --------------------------------------------------
const errors = [
    'Locked()',
    'TooLate()',
    'TooEarly()',
    'Overflow()',
    'NoEffect()',
    'NullInput()',
    'Underflow()',
    'InvalidType()',
    'OutOfBounds()',
    'InvalidToken()',
    'HighSlippage()',
    'InvalidAmount()',
    'FailedTransfer()',
    'NonExistentToken()',
    'UnprivilegedCaller()',
    'InsufficientBalance()',
    'MismatchedArrayLengths()',
    'InvalidArguments()',
    'InsufficientVotes()',
    'IllegalVote()',
    'InvalidNFT()',
    'InvalidOwner()',
    'InvalidState()',
    'AccessDenied()',
    'ContractAlreadyExists()',
    'GreeterCreated(address)',
    'AlreadyExecuted()',
    'OnlyWallet()',
    'OwnerExists()',
    'OwnerDoesNotExist()',
    'InvalidArgument()',
    'InsufficientConfirmations()',
    'ExecutionError()',
    'NothingToClaim()',
    'InvalidProof()',
];
const errorMessage = '0x2c5211c6';
// --------------------------------------------------

for (const error of errors) {
    const signature = web3.eth.abi.encodeFunctionSignature(error);
    if (signature === errorMessage) {
        console.log(error);
    }
}