import { Mina, PublicKey, fetchAccount } from 'o1js';
import { TokenElection, IpfsHash } from '../../TokenElection/BaseTokenElection.js';

import * as readline from 'node:readline/promises';  // This uses the promise-based APIs
import { stdin as input, stdout as output } from 'node:process';
import { PartialBallot } from '../../PackedTokensElection.js';

const rl = readline.createInterface({ input, output });

const zkAppAddressInput = await rl.question(`At what address is the ZK App Deployed?\n`);

rl.close();

// set up Mina instance and contract we interact with
const Network = Mina.Network('https://proxy.berkeley.minaexplorer.com/graphql');
Mina.setActiveInstance(Network);
let zkAppAddress = PublicKey.fromBase58(zkAppAddressInput);
let zkApp = new TokenElection(zkAppAddress);
await fetchAccount({ publicKey: zkAppAddress });
const onChainIpfsHash = zkApp.electionDetailsIpfs.get();
const ipfsHash = IpfsHash.unpack(onChainIpfsHash.packed).map(x => x.toString()).join('')
console.log(`
  Review the details of this election at: https://ipfs.io/ipfs/${ipfsHash}
`)

const ballot = zkApp.ballot.get();
const partial1 = new PartialBallot(ballot.partial1).toBigInts();
const partial2 = new PartialBallot(ballot.partial2).toBigInts();
const totalVotes = (partial1.concat(partial2)).map(x => String(x)).join(",")

console.log(`
  Current Vote Tallies: ${totalVotes}
`)