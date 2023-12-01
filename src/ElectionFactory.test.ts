import { Ballot, PartialBallot } from './TokenElection/BaseTokenElection';
import { AccountUpdate, Mina, PrivateKey, PublicKey, UInt32 } from 'o1js';
import { WhitelistTokenElection } from './TokenElection/WhitelistTokenElection';
import { deployWL, initializeWL } from './ElectionFactory';

describe("WhitelistTokenElection", () => {
  let zkappAddress: PublicKey;
  let sender: PublicKey;
  let zkappKey: PrivateKey;
  let senderKey: PrivateKey;
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

  describe("Deploys a whitelist token eleciton", () => {
    beforeEach(async () => {
      Mina.setActiveInstance(Local);

      sender = Local.testAccounts[0].publicKey;
      senderKey = Local.testAccounts[0].privateKey;

      const zkapp = deployWL({ publicKey: sender, privateKey: senderKey });
    });

    it("Verifies deployment", async () => {
      const zkappState = zkapp.ballot.get();
      const pb1 = PartialBallot.unpack(zkappState.partial1);
      const pb2 = PartialBallot.unpack(zkappState.partial2);
      expect(String(pb1)).toBe(String([0n, 0n, 0n, 0n, 0n, 0n, 0n]));
      expect(String(pb2)).toBe(String([0n, 0n, 0n, 0n, 0n, 0n, 0n]));
    });
  });

  describe("Adds addresses to a whitelist", () => {
    beforeEach(async () => {
      Mina.setActiveInstance(Local);

      sender = Local.testAccounts[0].publicKey;
      senderKey = Local.testAccounts[0].privateKey;

      const zkapp = await deployWL({ publicKey: sender, privateKey: senderKey });
      await initializeWL({ publicKey: sender, privateKey: senderKey }, zkapp, [
        Local.testAccounts[1].publicKey,
        Local.testAccounts[2].publicKey,
      ])
    });

    it("Verifies deployment", async () => {
      const whitelistedAccount = Local.testAccounts[1].publicKey;
      const acctBalance = await Mina.getBalance(whitelistedAccount, zkapp.token.id);
      expect(acctBalance.toString()).toBe(String(50_000))
    });
  });
});
