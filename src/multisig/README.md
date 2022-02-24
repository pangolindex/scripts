# Multisig

Commonly used actions for interacting with a gnosis multisig or gnosis safe. **Note** gnosis safe execution is not 
currently working.

### `confirm.js`
Confirm a proposed transaction. This can only be done by members of the multisig. All configuration is done internal to 
the script.

## `execute.js`
Execute a proposed transaction that has reached the confirmation threshold. This can only be done by members of the 
multisig. All configuration is done internal to the script.

### `resetDuration.js`
This is a relic of a former task which will likely not be replicated. The old code lives here in case it needs to be 
called upon and modified.

### `tokenApprove.js`
Approves a token for use from a multisig. This can only be done by members of the multisig. All configuration is done 
internal to the script. If the approval amount is not modified, a default approval of infinite will be performed.

### `tokenTransfer.js`
Transfers a token from a multisig. This can only be done by members of the multisig. All configuration is done
internal to the script.