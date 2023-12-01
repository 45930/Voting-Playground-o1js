/**
 * Users may want to create a new election with certain parameters
 * To start, let's create new token elections with a
 * - preset whitelist
 * - number of options to vote on
 * - how to count votes
 */

import { AccountUpdate, Mina, PrivateKey, PublicKey } from "o1js";
import { WhitelistTokenElection } from "./TokenElection/WhitelistTokenElection";

export async function deployWL(deployerAccount: { publicKey: PublicKey, privateKey: PrivateKey }): Promise<PublicKey> {
  const zkappKey = PrivateKey.random();
  const zkappAddress = zkappKey.toPublicKey();
  const zkapp = new WhitelistTokenElection(zkappAddress);
  let tx = await Mina.transaction(deployerAccount.publicKey, () => {
    AccountUpdate.fundNewAccount(deployerAccount.publicKey);
    zkapp.deploy({ zkappKey });
  });
  await tx.prove();
  await tx.sign([deployerAccount.privateKey]).send();
  return zkappAddress;
}

export async function initializeWL(
  senderAccount: { publicKey: PublicKey, privateKey: PrivateKey },
  zkappAddress: PublicKey,
  wl: Array<PublicKey>
) {
  const zkapp = new WhitelistTokenElection(zkappAddress);
  for (let i = 0; i < wl.length; i++) {
    let tx = await Mina.transaction(senderAccount.publicKey, () => {
      AccountUpdate.fundNewAccount(senderAccount.publicKey);
      zkapp.addToWhitelist(wl[i])
    });
    await tx.prove();
    await tx.sign([senderAccount.privateKey]).send();
  }
  let tx = await Mina.transaction(senderAccount.publicKey, () => {
    zkapp.finalizeWhitelist();
  });
  await tx.prove();
  await tx.sign([senderAccount.privateKey]).send();
}