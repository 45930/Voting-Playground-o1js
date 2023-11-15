// import { Ballot, PartialBallot, PackedTokensElection } from './PackedTokensElection';
// import { AccountUpdate, Mina, PrivateKey, PublicKey, UInt32 } from 'o1js';

// describe("PackedTokensElection", () => {
//   let privilegedAddress: PublicKey;
//   let zkappAddress: PublicKey;
//   let sender: PublicKey;
//   let privilegedKey: PrivateKey;
//   let zkappKey: PrivateKey;
//   let senderKey: PrivateKey;
//   let initialBalance = 10_000_000_000;
//   let zkapp: PackedTokensElection;

//   beforeAll(async () => {
//     console.time('compile');
//     await PackedTokensElection.compile();
//     console.timeEnd('compile');
//   });

//   beforeEach(async () => {
//     let Local = Mina.LocalBlockchain({ proofsEnabled: true });
//     zkappKey = PrivateKey.random();
//     zkappAddress = zkappKey.toPublicKey();
//     zkapp = new PackedTokensElection(zkappAddress);
//     Mina.setActiveInstance(Local);

//     sender = Local.testAccounts[0].publicKey;
//     senderKey = Local.testAccounts[0].privateKey;


//     // a special account that is allowed to pull out half of the zkapp balance, once
//     privilegedKey = PrivateKey.random();
//     privilegedAddress = privilegedKey.toPublicKey();
//   });

//   describe("Votes in the PackedTokensElection", () => {
//     beforeEach(async () => {
//       let Local = Mina.LocalBlockchain({ proofsEnabled: true });
//       zkappKey = PrivateKey.random();
//       zkappAddress = zkappKey.toPublicKey();
//       zkapp = new PackedTokensElection(zkappAddress);
//       Mina.setActiveInstance(Local);

//       sender = Local.testAccounts[0].publicKey;
//       senderKey = Local.testAccounts[0].privateKey;


//       // a special account that is allowed to pull out half of the zkapp balance, once
//       privilegedKey = PrivateKey.random();
//       privilegedAddress = privilegedKey.toPublicKey();

//       let tx = await Mina.transaction(sender, () => {
//         let senderUpdate = AccountUpdate.fundNewAccount(sender);
//         senderUpdate.send({ to: zkappAddress, amount: initialBalance });
//         zkapp.deploy({ zkappKey });
//       });
//       await tx.prove();
//       await tx.sign([senderKey]).send();

//       tx = await Mina.transaction(sender, () => {
//         let senderUpdate = AccountUpdate.fundNewAccount(sender);
//         zkapp.faucet(sender);
//         const partialBallot1 = PartialBallot.fromBigInts([0n, 0n, 100n, 0n, 0n, 0n, 0n]);
//         const partialBallot2 = PartialBallot.fromBigInts([0n, 0n, 0n, 0n, 0n, 0n, 10n]);
//         const myVote = new Ballot({
//           partial1: partialBallot1,
//           partial2: partialBallot2
//         })
//         zkapp.castVote(myVote, UInt32.from(110));
//       });
//       await tx.prove();
//       await tx.sign([senderKey]).send();
//     });

//     it("Updates the State", async () => {
//       const tx2 = await Mina.transaction(sender, () => {
//         zkapp.reduceVotes();
//       })
//       await tx2.prove();
//       await tx2.sign([senderKey]).send();
//       const zkappState = zkapp.ballot.get();
//       const pb1 = zkappState.partial1;
//       const pb2 = zkappState.partial2;
//       expect(String(pb1.toBigInts())).toBe(String([0n, 0n, 100n, 0n, 0n, 0n, 0n]));
//       expect(String(pb2.toBigInts())).toBe(String([0n, 0n, 0n, 0n, 0n, 0n, 10n]));
//     });

//     it("has the correct number of tokens remaining", async () => {
//       const remainingVoteBalance = await Mina.getBalance(sender, zkapp.token.id);
//       expect(remainingVoteBalance.toString()).toBe(String(50_000 - 110))
//     });

//     it("updates a second time", async () => {
//       let tx = await Mina.transaction(sender, () => {
//         const partialBallot1 = PartialBallot.fromBigInts([101n, 0n, 0n, 0n, 0n, 0n, 0n]);
//         const partialBallot2 = PartialBallot.fromBigInts([0n, 0n, 0n, 0n, 20n, 0n, 40n]);
//         const myVote = new Ballot({
//           partial1: partialBallot1,
//           partial2: partialBallot2
//         })
//         zkapp.castVote(myVote, UInt32.from(161));
//       });
//       await tx.prove();
//       await tx.sign([senderKey]).send();

//       const tx2 = await Mina.transaction(sender, () => {
//         zkapp.reduceVotes();
//       })
//       await tx2.prove();
//       await tx2.sign([senderKey]).send();
//       const zkappState = zkapp.ballot.get();
//       const pb1 = zkappState.partial1;
//       const pb2 = zkappState.partial2;
//       expect(String(pb1.toBigInts())).toBe(String([101n, 0n, 100n, 0n, 0n, 0n, 0n]));
//       expect(String(pb2.toBigInts())).toBe(String([0n, 0n, 0n, 0n, 20n, 0n, 50n]));
//     });
//   });
// });
