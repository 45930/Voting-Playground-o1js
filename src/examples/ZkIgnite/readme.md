# Zk Ignite Voting Example

Let's pretend we are hosting a ZK Ignite vote via Zkapp on Mina.  Anyone who likes may choose to be an elector for this example.  You may interact with this election live on the testnet.

## How to Participate

You will need to have a funded account on the testnet and the ability to clone this repo and run javascript on your machine.  There is no UI for this app yet.

1. clone the repo `git clone git@github.com:45930/Voting-Playground-o1js.git`
2. Install the dependencies and build the project `npm i && npm run build`
  - run `zk config` and use 'berkeley' as your deploy alias
3. Access the vote details `node build/src/examples/ZKIgnite/getElectionDetails.js`
  - When prompted for the contract, enter: B62qoMByycorTLENUAvV6Zr1gEfE5KERWSq1AanzPfc8dvKB8d1f3ka
4. Opt-in as an elector `node build/src/examples/ZKIgnite/joinElection.js`
  - When prompted for the contract, enter: B62qoMByycorTLENUAvV6Zr1gEfE5KERWSq1AanzPfc8dvKB8d1f3ka
  - You will need to sign this transaction, but in a more realistic scenario, Mina Foundation would decide who is eligible to be an elector.
5. Review the election details from step 3 and decide how you would like to vote.  You may vote for as many projects as you like, as long as the total vote amount is less than 50,000, since that is the balance you have to work with.
6. Submit your votes: `node build/src/examples/ZKIgnite/submitVotes.js`
7. After the vote transaction has been added, be a good citizen and call the rollup: `node build/src/examples/ZkIgnite/reduceVotes.js`

## Architecture

The goal of this example is to host a purely on-chain election of a similar style to Zk Ignite.  To bypass the storage limit of Mina, we use o1js-pack to pack a full IPFS hash into some fields, and the vote tally of every project being proposed.

For voting, we use custom tokens.  What's nice about custom tokens is we can have the election admin mint tokens to the electors, and we don't need to keep track of a separate nullifier hash of who has voted/not voted.  A nullifier hash would break the design principle of being purely on chain, because it would introduce a requirement that whoever tallies the votes has access to the nullifier tree.

For concurrency, we use actions/reducer.  When a user casts their vote, they burn tokens equal to the amount that they are voting.  They can vote for multiple options at once, and the action emitted will be an array of their votes.  The reducer adds the array of votes to the on-chain state.  Then anyone can view the vote totals on chain.

## Drawbacks

### Concurrency

Actions are fundamentally broken and won't scale to a large userbase.  If more actions are added to the contract than can be handled at once, then the contract becomes inoperable forever.  Put simply, this design would never work at scale, but it works for a demo.

### Identity

This system does allow for only identified parties to be "whitelisted" and only have those parties eligible to vote, but there's no actual proof of eligibility being done.

### Cost

There is a 1 Mina fee to add a new account, so minting new electors is not free, this is another scalability problem.

### Privacy

Votes are not private, and have no way of becoming private in this system.