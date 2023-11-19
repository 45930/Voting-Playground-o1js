import { Ballot, PartialBallot, PackedTokensElection, PROPOSAL_VOTE_ADDRESSES, Elector } from './PackedTokensElection';
import { AccountUpdate, Mina, PrivateKey, PublicKey, UInt32 } from 'o1js';

describe.skip("PackedTokensElection", () => {
  let zkappAddress: PublicKey;
  let sender: PublicKey;
  let zkappKey: PrivateKey;
  let senderKey: PrivateKey;
  let initialBalance = 10_000_000_000;
  let zkapp: PackedTokensElection;

  beforeAll(async () => {
    const c = Elector.fromBigInts([50_000n, 0n])
    console.time('compile');
    await PackedTokensElection.compile();
    console.timeEnd('compile');
  });

  beforeEach(async () => {
    let Local = Mina.LocalBlockchain({ proofsEnabled: true });
    zkappKey = PrivateKey.random();
    zkappAddress = zkappKey.toPublicKey();
    zkapp = new PackedTokensElection(zkappAddress);
    Mina.setActiveInstance(Local);

    sender = Local.testAccounts[0].publicKey;
    senderKey = Local.testAccounts[0].privateKey;
  });

  describe("Votes in the PackedTokensElection", () => {
    beforeEach(async () => {
      let Local = Mina.LocalBlockchain({ proofsEnabled: true });
      zkappKey = PrivateKey.random();
      zkappAddress = zkappKey.toPublicKey();
      zkapp = new PackedTokensElection(zkappAddress);
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

      tx = await Mina.transaction(sender, () => {
        AccountUpdate.fundNewAccount(sender);
        AccountUpdate.fundNewAccount(sender);
        AccountUpdate.fundNewAccount(sender);
        AccountUpdate.fundNewAccount(sender);
        zkapp.initProposalsA();
      });
      await tx.prove();
      await tx.sign([senderKey]).send();

      tx = await Mina.transaction(sender, () => {
        AccountUpdate.fundNewAccount(sender);
        AccountUpdate.fundNewAccount(sender);
        AccountUpdate.fundNewAccount(sender);
        zkapp.initProposalsB();
      });
      await tx.prove();
      await tx.sign([senderKey]).send();

      tx = await Mina.transaction(sender, () => {
        AccountUpdate.fundNewAccount(sender);
        AccountUpdate.fundNewAccount(sender);
        AccountUpdate.fundNewAccount(sender);
        AccountUpdate.fundNewAccount(sender);
        zkapp.initProposalsC();
      });
      await tx.prove();
      await tx.sign([senderKey]).send();

      tx = await Mina.transaction(sender, () => {
        AccountUpdate.fundNewAccount(sender);
        AccountUpdate.fundNewAccount(sender);
        AccountUpdate.fundNewAccount(sender);
        zkapp.initProposalsD();
      });
      await tx.prove();
      await tx.sign([senderKey]).send();

      tx = await Mina.transaction(sender, () => {
        AccountUpdate.fundNewAccount(sender);
        zkapp.faucet(sender);
      });
      await tx.prove();
      await tx.sign([senderKey]).send();

      tx = await Mina.transaction(sender, () => {
        const partialBallot1 = PartialBallot.fromBigInts([0n, 0n, 100n, 0n, 0n, 0n, 0n]);
        const partialBallot2 = PartialBallot.fromBigInts([0n, 0n, 0n, 0n, 0n, 0n, 10n]);
        const myVote = new Ballot({
          partial1: partialBallot1,
          partial2: partialBallot2
        })
        zkapp.castVote(myVote, UInt32.from(110));
      });
      await tx.prove();
      await tx.sign([senderKey]).send();
    });

    it("Updates the Token Balance of the voted project", () => {
      const project_2_address = PublicKey.fromBase58(PROPOSAL_VOTE_ADDRESSES[2])
      const project_2_balance = Mina.getBalance(project_2_address, zkapp.token.id);
      const project_13_address = PublicKey.fromBase58(PROPOSAL_VOTE_ADDRESSES[13])
      const project_13_balance = Mina.getBalance(project_13_address, zkapp.token.id);
      expect(project_2_balance.toString()).toBe(String(100))
      expect(project_13_balance.toString()).toBe(String(10))
    });

    it("Does not update the token balance of other accounts", () => {
      const project_0_address = PublicKey.fromBase58(PROPOSAL_VOTE_ADDRESSES[0])
      const project_0_balance = Mina.getBalance(project_0_address, zkapp.token.id);
      const project_12_address = PublicKey.fromBase58(PROPOSAL_VOTE_ADDRESSES[12])
      const project_12_balance = Mina.getBalance(project_12_address, zkapp.token.id);
      expect(project_0_balance.toString()).toBe(String(0))
      expect(project_12_balance.toString()).toBe(String(0))
    });

    it("Decrements the elector's balance and increases their num_votes count", () => {
      const raw_elector_balance = Mina.getBalance(sender, zkapp.token.id);
      const elector = Elector.unpack(raw_elector_balance.value);
      expect(elector[0].toString()).toBe(String(50_000 - 110));
      expect(elector[1].toString()).toBe('1');
    });

    describe("voting again", () => {
      beforeEach(async () => {
        let tx = await Mina.transaction(sender, () => {
          const partialBallot1 = PartialBallot.fromBigInts([100n, 0n, 50n, 0n, 0n, 0n, 0n]);
          const partialBallot2 = PartialBallot.fromBigInts([0n, 0n, 0n, 0n, 0n, 0n, 0n]);
          const myVote = new Ballot({
            partial1: partialBallot1,
            partial2: partialBallot2
          })
          zkapp.castVote(myVote, UInt32.from(150));
        });
        await tx.prove();
        await tx.sign([senderKey]).send();
      });

      it("Updates the Token Balance of the voted project", () => {
        const project_0_address = PublicKey.fromBase58(PROPOSAL_VOTE_ADDRESSES[0])
        const project_0_balance = Mina.getBalance(project_0_address, zkapp.token.id);
        const project_2_address = PublicKey.fromBase58(PROPOSAL_VOTE_ADDRESSES[2])
        const project_2_balance = Mina.getBalance(project_2_address, zkapp.token.id);
        expect(project_0_balance.toString()).toBe(String(100))
        expect(project_2_balance.toString()).toBe(String(150))
      });

      it("Decrements the elector's balance and increases their num_votes count", () => {
        const raw_elector_balance = Mina.getBalance(sender, zkapp.token.id);
        const elector = Elector.unpack(raw_elector_balance.value);
        expect(elector[0].toString()).toBe(String(50_000 - 260));
        expect(elector[1].toString()).toBe('2');
      });
    });
  });
});
