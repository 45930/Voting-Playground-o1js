import { Mina, PrivateKey, fetchAccount } from 'o1js';
import fs from 'fs/promises';
import { Ballot, Election, IpfsHash } from './Election.js';

import * as readline from 'node:readline/promises';  // This uses the promise-based APIs
import { stdin as input, stdout as output } from 'node:process';

// check command line arg
let deployAlias = process.argv[2];
if (!deployAlias)
  throw Error(`Missing <deployAlias> argument.

Usage:
node build/src/interact.js <deployAlias>
`);
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
let zkAppKey = PrivateKey.fromBase58(zkAppKeysBase58.privateKey);

// set up Mina instance and contract we interact with
const Network = Mina.Network(config.url);
const fee = Number(config.fee) * 1e9; // in nanomina (1 billion = 1.0 mina)
Mina.setActiveInstance(Network);
let feepayerAddress = feepayerKey.toPublicKey();
let zkAppAddress = zkAppKey.toPublicKey();
let zkApp = new Election(zkAppAddress);
await fetchAccount({ publicKey: zkAppAddress });
const onChainIpfsHash = zkApp.electionDetailsIpfs.get();
const ipfsHash = IpfsHash.unpack(onChainIpfsHash.packed).map(x => x.toString()).join('')

console.log(ipfsHash);

const rl = readline.createInterface({ input, output });

const answer = await rl.question(`Please review the vote details at: https://ipfs.io/ipfs/${ipfsHash} and enter your vote on the command line:`);

console.log(`Your vote has been recorded as: ${Number(answer)}`);

rl.close();

const myPackedVote = new Array<bigint>(3)
for (let i = 0; i < 3; i++) {
  if (Number(answer) == i) {
    myPackedVote[i] = 1n
  } else {
    myPackedVote[i] = 0n
  }
}

let sentTx;
// compile the contract to create prover keys
console.log('compile the contract...');
await Election.compile();
try {
  // call update() and send transaction
  console.log('build transaction and create proof...');
  let tx = await Mina.transaction({ sender: feepayerAddress, fee }, () =>
    zkApp.castBallot1(Ballot.fromBigInts(myPackedVote))
  );
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