import { SmartContract, state, State, method, UInt32, Reducer, Field } from 'o1js';
import { PackedUInt32Factory, MultiPackedStringFactory } from 'o1js-pack';

export class IpfsHash extends MultiPackedStringFactory(4) { }
export class Ballot extends PackedUInt32Factory() { }

export class Election extends SmartContract {
  @state(IpfsHash) electionDetailsIpfs = State<IpfsHash>();
  @state(Ballot) ballot1 = State<Ballot>();
  @state(Field) actionState = State<Field>();

  reducer = Reducer({ actionType: Ballot });

  init() {
    super.init();
    this.electionDetailsIpfs.set(IpfsHash.fromString(''));
    this.ballot1.set(Ballot.fromBigInts([0n, 0n, 0n, 0n, 0n, 0n, 0n]));
    this.actionState.set(Reducer.initialActionState);
  }

  @method
  setElectionDetails(electionDetailsIpfs: IpfsHash) {
    this.electionDetailsIpfs.getAndAssertEquals();
    this.electionDetailsIpfs.assertEquals(IpfsHash.fromString(''));
    this.electionDetailsIpfs.set(electionDetailsIpfs);
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
    this.reducer.dispatch(Ballot.fromUInt32s(unpackedBallot1));
  }

  @method
  reduceVotes() {
    const actionState = this.actionState.getAndAssertEquals();
    let pendingActions = this.reducer.getActions({
      fromActionState: actionState,
    });

    let { state: newVotes, actionState: newActionState } =
      this.reducer.reduce(
        pendingActions,
        Ballot,
        (state: { packed: Field }, _action: Ballot) => {
          const unpackedState = Ballot.unpack(state.packed);
          const unpackedAction = Ballot.unpack(_action.packed);
          for (let i = 0; i < Ballot.l; i++) {
            unpackedState[i] = unpackedState[i].add(unpackedAction[i])
          }
          return Ballot.fromUInt32s(unpackedState);
        },
        { state: new Ballot(Field(0)), actionState: actionState }
      );

    this.ballot1.set(new Ballot(newVotes.packed));
  }
}
