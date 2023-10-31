import { Ballot, TokenElection } from './TokenElection';
import { AccountUpdate, Mina, PrivateKey, PublicKey, UInt32 } from 'o1js';

describe("TokenElection", () => {
  let privilegedAddress: PublicKey;
  let zkappAddress: PublicKey;
  let sender: PublicKey;
  let privilegedKey: PrivateKey;
  let zkappKey: PrivateKey;
  let senderKey: PrivateKey;
  let initialBalance = 10_000_000_000;
  let zkapp: TokenElection;

  beforeAll(async () => {
    console.time('compile');
    await TokenElection.compile();
    console.timeEnd('compile');
  });

  beforeEach(async () => {
    let Local = Mina.LocalBlockchain({ proofsEnabled: true });
    zkappKey = PrivateKey.random();
    zkappAddress = zkappKey.toPublicKey();
    zkapp = new TokenElection(zkappAddress);
    Mina.setActiveInstance(Local);

    sender = Local.testAccounts[0].publicKey;
    senderKey = Local.testAccounts[0].privateKey;


    // a special account that is allowed to pull out half of the zkapp balance, once
    privilegedKey = PrivateKey.random();
    privilegedAddress = privilegedKey.toPublicKey();
  });

  describe("Votes in the TokenElection", () => {
    it("Updates the State", async () => {
      console.time('deploy');
      let tx = await Mina.transaction(sender, () => {
        let senderUpdate = AccountUpdate.fundNewAccount(sender);
        senderUpdate.send({ to: zkappAddress, amount: initialBalance });
        zkapp.deploy({ zkappKey });
      });
      await tx.prove();
      await tx.sign([senderKey]).send();
      console.timeEnd('deploy');

      console.log(
        'initial state: ',
        zkapp.ballot1.get().toBigInts(),
      );

      console.time('vote on ballot 1');
      tx = await Mina.transaction(sender, () => {
        const myVote = Ballot.fromBigInts([0n, 0n, 100n, 0n, 10n, 0n, 0n]);
        zkapp.castBallot1(myVote, UInt32.from(110));
      });
      await tx.prove();
      await tx.sign([senderKey]).send();
      console.timeEnd('vote on ballot 1');

      const tx2 = await Mina.transaction(sender, () => {
        zkapp.reduceVotes();
      })
      await tx2.prove();
      await tx2.sign([senderKey]).send();
      const zkappState = zkapp.ballot1.get();
      expect(String(zkappState.toBigInts())).toBe(String([0n, 0n, 100n, 0n, 10n, 0n, 0n]));
    });
  });
});
