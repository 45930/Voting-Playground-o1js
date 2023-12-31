import { SmartContract, state, Bool, Account, State, method, UInt32, AccountUpdate, UInt64, Reducer, Field, PublicKey, Struct, Provable } from 'o1js';
import { PackedUInt32Factory, MultiPackedStringFactory, PackedBoolFactory } from 'o1js-pack';

export class Flags extends PackedBoolFactory() { }
export class IpfsHash extends MultiPackedStringFactory(4) { }
export class PartialBallot extends PackedUInt32Factory() { }

export class Ballot extends Struct({
  partial1: Field,
  partial2: Field
}) { }

export class VoteAction extends Struct({
  ballot: Ballot
}) { }

export class WhitelistTokenElection extends SmartContract {
  @state(IpfsHash) electionDetailsIpfs = State<IpfsHash>();
  @state(Ballot) ballot = State<Ballot>();
  @state(Field) actionState = State<Field>();
  @state(Flags) flags = State<Flags>();

  reducer = Reducer({ actionType: VoteAction });

  init() {
    super.init();
    this.electionDetailsIpfs.set(IpfsHash.fromString(''));
    this.ballot.set({
      partial1: PartialBallot.fromBigInts([0n, 0n, 0n, 0n, 0n, 0n, 0n]).packed,
      partial2: PartialBallot.fromBigInts([0n, 0n, 0n, 0n, 0n, 0n, 0n]).packed
    });
    this.actionState.set(Reducer.initialActionState);
    this.account.delegate.set(this.sender);
  }

  assertWhitelistOpen() {
    const flags = this.flags.getAndAssertEquals();
    Flags.unpack(flags.packed)[0].assertEquals(Bool(false));
  }

  assertAccountUnfunded(address: PublicKey) {
    const account = Account(address, this.token.id);
    const tokenBalance = account.balance.getAndAssertEquals();
    tokenBalance.assertEquals(UInt64.from(0));
  }

  @method
  addToWhitelist(address: PublicKey) {
    this.assertWhitelistOpen();
    this.assertAccountUnfunded(address);
    this.token.mint({
      address: address,
      amount: 50_000
    });
  }

  @method
  finalizeWhitelist() {
    const delegate = this.account.delegate.getAndAssertEquals();
    this.sender.assertEquals(delegate);

    const flags = this.flags.getAndAssertEquals();
    const unpackedFlags = Flags.unpack(flags.packed)
    unpackedFlags[0].assertEquals(Bool(false));

    unpackedFlags[0] = Bool(true);
    this.flags.set(Flags.fromBools(unpackedFlags));
  }

  @method
  setElectionDetails(electionDetailsIpfs: IpfsHash) {
    this.electionDetailsIpfs.getAndAssertEquals();
    this.electionDetailsIpfs.assertEquals(IpfsHash.fromString(''));
    this.electionDetailsIpfs.set(electionDetailsIpfs);
  }

  @method
  castVote(vote: Ballot, amount: UInt32) {
    const unpackedVote1 = PartialBallot.unpack(vote.partial1);
    const unpackedVote2 = PartialBallot.unpack(vote.partial2);

    let voteSum = UInt32.from(0);
    for (let i = 0; i < PartialBallot.l; i++) {
      voteSum = voteSum.add(unpackedVote1[i]);
    }
    for (let i = 0; i < PartialBallot.l; i++) {
      voteSum = voteSum.add(unpackedVote2[i]);
    }
    voteSum.assertEquals(amount); // sum of votes must equal asserted amount (can vote for multiple options)
    this.token.burn({
      address: this.sender,
      amount: UInt64.from(amount)
    });
    this.reducer.dispatch({
      ballot: vote
    });
  }

  @method
  reduceVotes() {
    const ballot = this.ballot.getAndAssertEquals();
    const actionState = this.actionState.getAndAssertEquals();

    let pendingActions = this.reducer.getActions({
      fromActionState: actionState,
    }).slice(0, 3); // at most, reduce 3 actions

    let { state: newVotes, actionState: newActionState } =
      this.reducer.reduce(
        pendingActions,
        Ballot,
        (state: Ballot, _action: VoteAction) => {
          const unpackedState1 = PartialBallot.unpack(state.partial1);
          const unpackedState2 = PartialBallot.unpack(state.partial2);
          const unpackedAction1 = PartialBallot.unpack(_action.ballot.partial1);
          const unpackedAction2 = PartialBallot.unpack(_action.ballot.partial2);
          for (let i = 0; i < PartialBallot.l; i++) {
            unpackedState1[i] = unpackedState1[i].add(unpackedAction1[i])
          }
          for (let i = 0; i < PartialBallot.l; i++) {
            unpackedState2[i] = unpackedState2[i].add(unpackedAction2[i])
          }
          return {
            partial1: PartialBallot.fromUInt32s(unpackedState1).packed,
            partial2: PartialBallot.fromUInt32s(unpackedState2).packed
          }
        },
        {
          state: ballot, actionState: actionState
        }
      );

    this.ballot.set(newVotes);
    this.actionState.set(newActionState);
  }
}
