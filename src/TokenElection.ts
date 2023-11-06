import { SmartContract, state, State, method, UInt32, AccountUpdate, UInt64, Reducer, Field, PublicKey } from 'o1js';
import { PackedUInt32Factory, MultiPackedStringFactory } from 'o1js-pack';

export class IpfsHash extends MultiPackedStringFactory(4) { }
export class Ballot extends PackedUInt32Factory() { }

export class TokenElection extends SmartContract {
  @state(IpfsHash) electionDetailsIpfs = State<IpfsHash>();
  @state(Ballot) ballot = State<Ballot>();
  @state(Field) actionState = State<Field>();

  reducer = Reducer({ actionType: Ballot });

  init() {
    super.init();
    this.electionDetailsIpfs.set(IpfsHash.fromString(''));
    this.ballot.set(Ballot.fromBigInts([0n, 0n, 0n, 0n, 0n, 0n, 0n]));
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
  castBallot(vote: Ballot, amount: UInt32) {
    const unpackedVote = Ballot.unpack(vote.packed);
    const ballot = this.ballot.getAndAssertEquals();
    const unpackedBallot = Ballot.unpack(ballot.packed);

    let voteSum = UInt32.from(0);
    for (let i = 0; i < Ballot.l; i++) {
      voteSum = voteSum.add(unpackedVote[i]);
      unpackedBallot[i] = unpackedBallot[i].add(unpackedVote[i]);
    }
    voteSum.assertEquals(amount); // sum of votes must equal asserted amount (can vote for multiple options)
    this.token.burn({
      address: this.sender,
      amount: UInt64.from(amount)
    });
    this.reducer.dispatch(Ballot.fromUInt32s(unpackedBallot));
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

    this.ballot.set(new Ballot(newVotes.packed));
  }
}
