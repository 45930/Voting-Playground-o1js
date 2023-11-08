import { SmartContract, state, State, method, UInt32, AccountUpdate, UInt64, Reducer, Field, PublicKey, Struct } from 'o1js';
import { PackedUInt32Factory, MultiPackedStringFactory } from 'o1js-pack';

export class IpfsHash extends MultiPackedStringFactory(4) { }
export class PartialBallot extends PackedUInt32Factory() { }

export class Ballot extends Struct({
  partial1: PartialBallot,
  partial2: PartialBallot
}) { }

export class TokenElection extends SmartContract {
  @state(IpfsHash) electionDetailsIpfs = State<IpfsHash>();
  @state(Ballot) ballot = State<Ballot>();
  @state(Field) actionState = State<Field>();

  reducer = Reducer({ actionType: Ballot });

  init() {
    super.init();
    this.electionDetailsIpfs.set(IpfsHash.fromString(''));
    this.ballot.set({
      partial1: PartialBallot.fromBigInts([0n, 0n, 0n, 0n, 0n, 0n, 0n]),
      partial2: PartialBallot.fromBigInts([0n, 0n, 0n, 0n, 0n, 0n, 0n])
    });
    this.actionState.set(Reducer.initialActionState);
  }

  @method
  faucet(toAddress: PublicKey) {
    this.token.mint({
      address: toAddress,
      amount: 50_000
    });
  }

  @method
  setElectionDetails(electionDetailsIpfs: IpfsHash) {
    this.electionDetailsIpfs.getAndAssertEquals();
    this.electionDetailsIpfs.assertEquals(IpfsHash.fromString(''));
    this.electionDetailsIpfs.set(electionDetailsIpfs);
  }

  @method
  castVote(vote: Ballot, amount: UInt32) {
    const unpackedVote1 = PartialBallot.unpack(vote.partial1.packed);
    const unpackedVote2 = PartialBallot.unpack(vote.partial2.packed);
    const ballot = this.ballot.getAndAssertEquals();
    const unpackedPartialBallot1 = PartialBallot.unpack(ballot.partial1.packed);
    const unpackedPartialBallot2 = PartialBallot.unpack(ballot.partial2.packed);

    let voteSum = UInt32.from(0);
    for (let i = 0; i < PartialBallot.l; i++) {
      voteSum = voteSum.add(unpackedVote1[i]);
      unpackedPartialBallot1[i] = unpackedPartialBallot1[i].add(unpackedVote1[i]);
    }
    for (let i = 0; i < PartialBallot.l; i++) {
      voteSum = voteSum.add(unpackedVote2[i]);
      unpackedPartialBallot2[i] = unpackedPartialBallot1[i].add(unpackedVote2[i]);
    }
    voteSum.assertEquals(amount); // sum of votes must equal asserted amount (can vote for multiple options)
    this.token.burn({
      address: this.sender,
      amount: UInt64.from(amount)
    });
    this.reducer.dispatch(vote);
  }

  @method
  reduceVotes() {
    const actionState = this.actionState.getAndAssertEquals();
    const ballot = this.ballot.getAndAssertEquals();
    let pendingActions = this.reducer.getActions({
      fromActionState: actionState,
    });

    let { state: newVotes, actionState: newActionState } =
      this.reducer.reduce(
        pendingActions,
        Ballot,
        (state: Ballot, _action: Ballot) => {
          const unpackedState1 = PartialBallot.unpack(state.partial1.packed);
          const unpackedState2 = PartialBallot.unpack(state.partial2.packed);
          const unpackedAction1 = PartialBallot.unpack(_action.partial1.packed);
          const unpackedAction2 = PartialBallot.unpack(_action.partial2.packed);
          for (let i = 0; i < PartialBallot.l; i++) {
            unpackedState1[i] = unpackedState1[i].add(unpackedAction1[i])
          }
          for (let i = 0; i < PartialBallot.l; i++) {
            unpackedState2[i] = unpackedState2[i].add(unpackedAction2[i])
          }
          return {
            partial1: PartialBallot.fromUInt32s(unpackedState1),
            partial2: PartialBallot.fromUInt32s(unpackedState2)
          }
        },
        {
          state: {
            partial1: new PartialBallot(Field(0)),
            partial2: new PartialBallot(Field(0)),
          }, actionState: actionState
        }
      );

    this.ballot.set(newVotes);
    this.actionState.set(newActionState);
  }
}
