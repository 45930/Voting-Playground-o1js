# Zk Ignite Voting Example

Let's pretend we are hosting a ZK Ignite vote via Zkapp on Mina.  Anyone who likes may choose to be an elector for this example.  You may interact with this election live on the testnet.

## How to Participate

You will need to have a funded account on the testnet and the ability to clone this repo and run javascript on your machine.  There is no UI for this app yet.

1. clone the repo `git clone git@github.com:45930/Voting-Playground-o1js.git`
2. Install the dependencies and build the project `npm i && npm run build`
3. Access the vote details `node build/src/examples/ZKIgnite/getElectionDetails.js`
  - When prompted for the contract, enter: 
4. Opt-in as an elector `node build/src/examples/ZKIgnite/joinElection.js`
  - When prompted for the contract, enter: 
  - You will need to sign this transaction, but in a more realistic scenario, Mina Foundation would decide who is eligible to be an elector.
5. Review the election details from step 3 and decide how you would like to vote.  You may vote for as many projects as you like, as long as the total vote amount is less than 50,000, since that is the balance you have to work with.
6. Submit your votes: `node build/src/examples/ZKIgnite/submitVotes.js`
7. Check your transaction at: 

## Architecture

## Drawbacks
