# Governance

Common tasks for interacting with GovernorAlpha

### `execute.js`
Executes a proposal that has been sufficiently voted and queued. This script is intended to be run by any EOA as the 
execute call itself is not permissioned. Configuration is done internally to the script.

### `propose.js`
No way of putting it lightly; this script is a beast. It includes a template for how to create and format a governance 
proposal, but use cases will vary drastically from proposal to proposal. There is some internal configuration to allow 
submitting via gnosis multisig or gnosis safe after the transaction itself has been built. Pay close attention to how 
the proposal description is formatted as this is actually quite important to ensure the Pangolin UI parses it correctly.

### `vote.js`
Votes on a proposal. The vote can be in favor or against. Configuration is all internal. This method is provided mainly 
to ensure that multi signature DAOs which hold or have been delegated PNG can vote on proposals.