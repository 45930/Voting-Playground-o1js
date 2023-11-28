import { AccountUpdate, Mina, PrivateKey, PublicKey, UInt32, fetchAccount, setArchiveGraphqlEndpoint } from 'o1js';
import { TokenElection, IpfsHash, PartialBallot, Ballot } from '../../TokenElection/BaseTokenElection.js';
import fs from 'fs/promises';

import * as readline from 'node:readline/promises';  // This uses the promise-based APIs
import { stdin as input, stdout as output } from 'node:process';


const rl = readline.createInterface({ input, output });

const zkAppAddressInput = await rl.question(`At what address is the ZK App Deployed?\n`);

rl.close();

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
const Network = Mina.Network({
  mina: config.url,
  archive: 'https://archive.berkeley.minaexplorer.com'
})
const fee = Number(config.fee) * 1e9; // in nanomina (1 billion = 1.0 mina)
Mina.setActiveInstance(Network);
let zkAppAddress = PublicKey.fromBase58(zkAppAddressInput)
let zkApp = new TokenElection(zkAppAddress);
await fetchAccount({ publicKey: zkAppAddress });

console.log(zkApp.actionState.get().toString())
// compile the contract to create prover keys
console.log('compile the contract...');
await TokenElection.compile();
let reduceTx;
try {
  // Join the election by minting tokens to yourself
  let tx = await Mina.transaction({ sender: feepayerAddress, fee }, () => {
    zkApp.reduceVotes();
  });
  await tx.prove();
  reduceTx = await tx.sign([feepayerKey]).send();
} catch (err) {
  console.log(err);
}
if (reduceTx?.hash() !== undefined) {
  console.log(`
Success! Update transaction sent.

Your smart contract state will be updated
as soon as the transaction is included in a block:
https://berkeley.minaexplorer.com/transaction/${reduceTx.hash()}
`);
}