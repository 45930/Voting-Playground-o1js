import { SmartContract, state, State, method, UInt32 } from 'o1js';
import { PackedUInt32Factory } from 'o1js-pack';

export class Ballot extends PackedUInt32Factory() {}

export class Election extends SmartContract {
  @state(Ballot) ballot1 = State<Ballot>();

  init() {
    super.init();
    this.ballot1.set(Ballot.fromBigInts([0n, 0n, 0n, 0n, 0n, 0n, 0n]));
  }

  @method
  castBallot1(vote: Ballot) {
    const unpackedVote = Ballot.unpack(vote.packed);
    const ballot1 = this.ballot1.getAndAssertEquals();
    const unpackedBallot1 = Ballot.unpack(ballot1.packed);

    let voteSum = UInt32.from(0);
    for (let i = 0; i < Ballot.l; i++) {
      voteSum = voteSum.add(unpackedVote[i]);
      unpackedBallot1[i] = unpackedBallot1[i].add(unpackedVote[i]);
    }
    voteSum.value.assertEquals(1); // vote must be exactly one vote for one choice
    this.ballot1.set(Ballot.fromUInt32s(unpackedBallot1));
  }
}
