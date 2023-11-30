import { Ballot, PartialBallot } from './BaseTokenElection';
import { AccountUpdate, Mina, PrivateKey, PublicKey, UInt32 } from 'o1js';
import { WhitelistTokenElection } from './WhitelistTokenElection';

describe("WhitelistTokenElection", () => {
  let zkappAddress: PublicKey;
  let sender: PublicKey;
  let zkappKey: PrivateKey;
  let senderKey: PrivateKey;
  let initialBalance = 10_000_000_000;
  let zkapp: WhitelistTokenElection;
  let Local = Mina.LocalBlockchain({ proofsEnabled: true });

  beforeAll(async () => {
    console.time('compile');
    await WhitelistTokenElection.compile();
    console.timeEnd('compile');
  });

  beforeEach(async () => {
    zkappKey = PrivateKey.random();
    zkappAddress = zkappKey.toPublicKey();
    zkapp = new WhitelistTokenElection(zkappAddress);
    Mina.setActiveInstance(Local);

    sender = Local.testAccounts[0].publicKey;
    senderKey = Local.testAccounts[0].privateKey;
  });

  describe("Votes in the WhitelistTokenElection", () => {
    beforeEach(async () => {
      zkappKey = PrivateKey.random();
      zkappAddress = zkappKey.toPublicKey();
      zkapp = new WhitelistTokenElection(zkappAddress);
      Mina.setActiveInstance(Local);

      sender = Local.testAccounts[0].publicKey;
      senderKey = Local.testAccounts[0].privateKey;

      let tx = await Mina.transaction(sender, () => {
        let senderUpdate = AccountUpdate.fundNewAccount(sender);
        senderUpdate.send({ to: zkappAddress, amount: initialBalance });
        zkapp.deploy({ zkappKey });
      });
      await tx.prove();
      await tx.sign([senderKey]).send();

      const wlPks = [
        Local.testAccounts[1].privateKey,
        Local.testAccounts[2].privateKey,
        Local.testAccounts[3].privateKey
      ]

      const wl = [
        wlPks[0].toPublicKey(),
        wlPks[1].toPublicKey(),
        wlPks[2].toPublicKey()
      ]

      tx = await Mina.transaction(sender, () => {
        let senderUpdate = AccountUpdate.fundNewAccount(sender);
        zkapp.addToWhitelist(wl[0]);
      });
      await tx.prove();
      await tx.sign([senderKey]).send();

      tx = await Mina.transaction(sender, () => {
        let senderUpdate = AccountUpdate.fundNewAccount(sender);
        zkapp.addToWhitelist(wl[1]);
      });
      await tx.prove();
      await tx.sign([senderKey]).send();

      tx = await Mina.transaction(sender, () => {
        let senderUpdate = AccountUpdate.fundNewAccount(sender);
        zkapp.addToWhitelist(wl[2]);
        zkapp.finalizeWhitelist();
      });
      await tx.prove();
      await tx.sign([senderKey]).send();

      tx = await Mina.transaction(wl[0], () => {
        const partialBallot1 = PartialBallot.fromBigInts([0n, 0n, 100n, 0n, 0n, 0n, 0n]);
        const partialBallot2 = PartialBallot.fromBigInts([0n, 0n, 0n, 0n, 0n, 0n, 10n]);
        const myVote = new Ballot({
          partial1: partialBallot1.packed,
          partial2: partialBallot2.packed
        })
        zkapp.castVote(myVote, UInt32.from(110));
      });
      await tx.prove();
      await tx.sign([wlPks[0]]).send();
    });

    it("Updates the State", async () => {
      const wlPks = [
        Local.testAccounts[1].privateKey,
        Local.testAccounts[2].privateKey,
        Local.testAccounts[3].privateKey
      ]

      const wl = [
        wlPks[0].toPublicKey(),
        wlPks[1].toPublicKey(),
        wlPks[2].toPublicKey()
      ]
      const tx2 = await Mina.transaction(wl[0], () => {
        zkapp.reduceVotes();
      })
      await tx2.prove();
      await tx2.sign([wlPks[0]]).send();
      const zkappState = zkapp.ballot.get();
      const pb1 = PartialBallot.unpack(zkappState.partial1);
      const pb2 = PartialBallot.unpack(zkappState.partial2);
      expect(String(pb1)).toBe(String([0n, 0n, 100n, 0n, 0n, 0n, 0n]));
      expect(String(pb2)).toBe(String([0n, 0n, 0n, 0n, 0n, 0n, 10n]));
    });

    it("has the correct number of tokens remaining", async () => {
      const wlPks = [
        Local.testAccounts[1].privateKey,
        Local.testAccounts[2].privateKey,
        Local.testAccounts[3].privateKey
      ]
      const wl = [
        wlPks[0].toPublicKey(),
        wlPks[1].toPublicKey(),
        wlPks[2].toPublicKey()
      ]
      let remainingVoteBalance = await Mina.getBalance(wl[0], zkapp.token.id);
      expect(remainingVoteBalance.toString()).toBe(String(50_000))
      const tx2 = await Mina.transaction(wl[0], () => {
        zkapp.reduceVotes();
      })
      await tx2.prove();
      await tx2.sign([wlPks[0]]).send();
      remainingVoteBalance = await Mina.getBalance(wl[0], zkapp.token.id);
      expect(remainingVoteBalance.toString()).toBe(String(50_000 - 110))
    });

    it("updates a second time", async () => {
      const wlPks = [
        Local.testAccounts[1].privateKey,
        Local.testAccounts[2].privateKey,
        Local.testAccounts[3].privateKey
      ]
      const wl = [
        wlPks[0].toPublicKey(),
        wlPks[1].toPublicKey(),
        wlPks[2].toPublicKey()
      ]
      let tx = await Mina.transaction(wl[0], () => {
        const partialBallot1 = PartialBallot.fromBigInts([101n, 0n, 0n, 0n, 0n, 0n, 0n]);
        const partialBallot2 = PartialBallot.fromBigInts([0n, 0n, 0n, 0n, 20n, 0n, 40n]);
        const myVote = new Ballot({
          partial1: partialBallot1.packed,
          partial2: partialBallot2.packed
        })
        zkapp.castVote(myVote, UInt32.from(161));
      });
      await tx.prove();
      await tx.sign([wlPks[0]]).send();

      const tx2 = await Mina.transaction(wl[0], () => {
        zkapp.reduceVotes();
      })
      await tx2.prove();
      await tx2.sign([wlPks[0]]).send();
      const zkappState = zkapp.ballot.get();
      const pb1 = PartialBallot.unpack(zkappState.partial1);
      const pb2 = PartialBallot.unpack(zkappState.partial2);
      expect(String(pb1)).toBe(String([101n, 0n, 100n, 0n, 0n, 0n, 0n]));
      expect(String(pb2)).toBe(String([0n, 0n, 0n, 0n, 20n, 0n, 50n]));
    });
  });
});
