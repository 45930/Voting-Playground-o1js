import { AccountUpdate, Mina, PrivateKey, PublicKey } from 'o1js';
import { Ballot, Election } from './Election.js';

describe("Election", () => {
    let privilegedAddress: PublicKey;
    let zkappAddress: PublicKey;
    let sender: PublicKey;
    let privilegedKey: PrivateKey;
    let zkappKey: PrivateKey;
    let senderKey: PrivateKey;
    let initialBalance = 10_000_000_000;
    let zkapp: Election;

    beforeAll(async () => {
        console.time('compile');
        await Election.compile();
        console.timeEnd('compile');
    });

    beforeEach(async () => {
        let Local = Mina.LocalBlockchain({ proofsEnabled: true });
        zkappKey = PrivateKey.random();
        zkappAddress = zkappKey.toPublicKey();
        zkapp = new Election(zkappAddress);
        Mina.setActiveInstance(Local);

        sender = Local.testAccounts[0].publicKey;
        senderKey = Local.testAccounts[0].privateKey;

    
        // a special account that is allowed to pull out half of the zkapp balance, once
        privilegedKey = PrivateKey.random();
        privilegedAddress = privilegedKey.toPublicKey();
    });

    describe("Votes in the Election", () => {
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
            const myVote = Ballot.fromBigInts([0n, 0n, 1n, 0n, 0n, 0n, 0n]);
            zkapp.castBallot1(myVote);
            });
            await tx.prove();
            await tx.sign([senderKey]).send();
            console.timeEnd('vote on ballot 1');
            expect(zkapp.ballot1.get().toBigInts()).toBe([0n, 0n, 1n, 0n, 0n, 0n, 0n]);
        });
    });
});
