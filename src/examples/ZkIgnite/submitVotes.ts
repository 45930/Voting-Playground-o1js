import { AccountUpdate, Mina, PrivateKey, PublicKey, UInt32, fetchAccount, setArchiveGraphqlEndpoint } from 'o1js';
import { TokenElection, IpfsHash, PartialBallot, Ballot } from './../../TokenElection.js';
import fs from 'fs/promises';

import * as readline from 'node:readline/promises';  // This uses the promise-based APIs
import { stdin as input, stdout as output } from 'node:process';


const rl = readline.createInterface({ input, output });

const zkAppAddressInput = await rl.question(`At what address is the ZK App Deployed?\n`);

const confirm = await rl.question(`Votes in votes.json are correct?  Y/n\n`);

rl.close();

if (confirm.toLowerCase() != 'y') {
  throw new Error("Update votes.json, then continue")
}

let deployAlias = 'berkeley'
Error.stackTraceLimit = 1000;

// parse config and private key from file
type Config = {
  deployAliases: Record<
    string,
    {
      url: string;
      keyPath: string;
      fee: string;
      feepayerKeyPath: string;
      feepayerAlias: string;
    }
  >;
};
let configJson: Config = JSON.parse(await fs.readFile('config.json', 'utf8'));
let config = configJson.deployAliases[deployAlias];
let feepayerKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.feepayerKeyPath, 'utf8')
);

let zkAppKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.keyPath, 'utf8')
);
let feepayerKey = PrivateKey.fromBase58(feepayerKeysBase58.privateKey);
let feepayerAddress = feepayerKey.toPublicKey();

// set up Mina instance and contract we interact with
const Network = Mina.Network(config.url);
setArchiveGraphqlEndpoint('https://api.minascan.io/archive/berkeley/v1/graphql')
const fee = Number(config.fee) * 1e9; // in nanomina (1 billion = 1.0 mina)
Mina.setActiveInstance(Network);
let zkAppAddress = PublicKey.fromBase58(zkAppAddressInput)
let zkApp = new TokenElection(zkAppAddress);
await fetchAccount({ publicKey: zkAppAddress });

const votes = JSON.parse(await fs.readFile('./src/examples/ZkIgnite/votes.json', 'utf8'));
console.log(votes)
const partialBallot1 = new Array(7).fill(0n);
const partialBallot2 = new Array(7).fill(0n);
let sum = 0;
for (let key in votes) {
  const keyNum = Number(key)
  if (keyNum < 7) {
    partialBallot1[keyNum] = BigInt(votes[key])
    sum += Number(votes[key])
  } else if (keyNum < 14) {
    partialBallot2[keyNum - 7] = BigInt(votes[key])
    sum += Number(votes[key])
  } else {
    throw new Error("KeyError: Vote keys must be numeric between 0-13")
  }
}
const ballot = new Ballot({
  partial1: PartialBallot.fromBigInts(partialBallot1),
  partial2: PartialBallot.fromBigInts(partialBallot2),
});
console.log(`Submitting Votes: ${(partialBallot1.concat(partialBallot2)).map(x => String(x)).join(",")}`)
let sentTx;
// compile the contract to create prover keys
console.log('compile the contract...');
await TokenElection.compile();
try {
  // Join the election by minting tokens to yourself
  console.log('build transaction and create proof...');
  let tx = await Mina.transaction({ sender: feepayerAddress, fee }, () => {
    zkApp.reduceVotes();
    zkApp.castVote(ballot, UInt32.from(sum))
  });
  await tx.prove();
  console.log('send transaction...');
  sentTx = await tx.sign([feepayerKey]).send();
} catch (err) {
  console.log(err);
}
if (sentTx?.hash() !== undefined) {
  console.log(`
Success! Update transaction sent.

Your smart contract state will be updated
as soon as the transaction is included in a block:
https://berkeley.minaexplorer.com/transaction/${sentTx.hash()}
`);
}