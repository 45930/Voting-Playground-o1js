import { SmartContract, state, State, method, UInt32, AccountUpdate, UInt64 } from 'o1js';
import { PackedUInt32Factory, MultiPackedStringFactory } from 'o1js-pack';

export class IpfsHash extends MultiPackedStringFactory(4) { }
export class Ballot extends PackedUInt32Factory() { }

export class TokenElection extends SmartContract {
  @state(IpfsHash) electionDetailsIpfs = State<IpfsHash>();
  @state(Ballot) ballot1 = State<Ballot>();

  init() {
    super.init();
    this.electionDetailsIpfs.set(IpfsHash.fromString(''));
    this.ballot1.set(Ballot.fromBigInts([0n, 0n, 0n, 0n, 0n, 0n, 0n]));
  }

  @method
  setElectionDetails(electionDetailsIpfs: IpfsHash) {
    this.electionDetailsIpfs.getAndAssertEquals();
    this.electionDetailsIpfs.assertEquals(IpfsHash.fromString(''));
    this.electionDetailsIpfs.set(electionDetailsIpfs);
  }

  @method
  castBallot1(vote: Ballot, amount: UInt32) {
    const unpackedVote = Ballot.unpack(vote.packed);
    const ballot1 = this.ballot1.getAndAssertEquals();
    const unpackedBallot1 = Ballot.unpack(ballot1.packed);

    let voteSum = UInt32.from(0);
    for (let i = 0; i < Ballot.l; i++) {
      voteSum = voteSum.add(unpackedVote[i]);
      unpackedBallot1[i] = unpackedBallot1[i].add(unpackedVote[i]);
    }
    voteSum.assertEquals(amount); // sum of votes must equal asserted amount (can vote for multiple options)
    let au = AccountUpdate.create(this.sender);
    au.requireSignature();
    au.send({ to: this, amount: UInt64.from(amount) }); // todo, send amounts in UInt64 instead of 32
    this.ballot1.set(Ballot.fromUInt32s(unpackedBallot1));
  }
}
