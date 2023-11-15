import { SmartContract, state, State, method, UInt32, Struct, UInt64, PublicKey, fetchAccount, Mina } from 'o1js';
import { PackedUInt32Factory, MultiPackedStringFactory } from 'o1js-pack';

export class IpfsHash extends MultiPackedStringFactory(4) { }
export class PartialBallot extends PackedUInt32Factory() { }

export class Ballot extends Struct({
  partial1: PartialBallot,
  partial2: PartialBallot
}) { }

export class Elector extends PackedUInt32Factory(2) { }

const MAX_BALLOTS = 2;

// example for testing - vote targets must be addresses so they will be compatible with custom tokens
// We don't need their private keys since a vote recepient can't send or do anything with their votes
export const PROPOSAL_VOTE_ADDRESSES = [
  'B62qjmHWm7NjMUodZRnSHDfPqKZsfyaL2YnyU3Yc5rLfRKLbCsowKtc',
  'B62qr1DKZu7wSEs9nxt83JLTEQhBt2ivcpeuEy8yTy44bBSKYnbPWHm',
  'B62qmi9Pv8D79Vu41A1kM7RPcb4NQQbscUovpmsMdkMD1oYDYRNokA7',
  'B62qmXMX6mvsyt7cK7WaJyLpZZiNzbXM4TPjC3zxa8BohePJBW2KmJg',
  'B62qm3aJ84KriBzCCzT1ZbzDd8vfsNxQAEHnrTdQB5aLArqiZJ8DqX1',
  'B62qp3jka3ARjWvua5AEbanNMzJ9vvfkVzCUUnhAzrPTTycW1zUs54Z',
  'B62qnATYY9cSEGDxR1jsEZ8X3R8FDJxq6VQw5uuCnnS2eA5TjFmwD7y',
  'B62qjoRr6SzrdidQfxA3CBtW8mELty72FaZymWjw6s5tDfw6Sm8xx8g',
  'B62qmg5ZeHQRSjUXAZ1NTQxxhu24VkMT7PJ5krNxukpWPaTE8NxBmLa',
  'B62qmVuzkyEC1j3Z6S3PPcph2u5tt1HWSgojRPAUZBMtqqSNebGe5d9',
  'B62qkNy4Eawd8QoNAQF913mzegmFdPXaaxpbGD4GJt4qjDGAzDoJqBs',
  'B62qktuDV9p5rVrrm4d7pf47HEeDyPDmCBzXrYDSYU2tvG5EYMWdsmN',
  'B62qog9E8ghfTFEUjTQLVgk3K6W8Ux3KojvpfKSaHtWjp2vuvE3fRfh',
  'B62qjyL1xnycNLtNmJL43bCYEUUwz72q9pX1L3PGBhZp9YbJnKzCVny'
]

export class PackedTokensElection extends SmartContract {
  @state(IpfsHash) electionDetailsIpfs = State<IpfsHash>();
  @state(Ballot) ballot = State<Ballot>();

  init() {
    super.init();
    this.electionDetailsIpfs.set(IpfsHash.fromString(''));
    this.ballot.set({
      partial1: PartialBallot.fromBigInts([0n, 0n, 0n, 0n, 0n, 0n, 0n]),
      partial2: PartialBallot.fromBigInts([0n, 0n, 0n, 0n, 0n, 0n, 0n])
    });
  }

  @method
  faucet(toAddress: PublicKey) {
    /**
     * Create a new Elector with state:
     * token_balance: 50_000,
     * token_balance: 0,
     */
    const elector = Elector.fromBigInts([50_000n, 0n]);
    this.token.mint({
      address: toAddress,
      amount: UInt64.from(elector.packed)
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
    const currentTokenBalance = Mina.getBalance(this.sender, this.tokenId);
    const existingElector = Elector.unpack(currentTokenBalance.value);
    existingElector[0].assertLessThan(UInt32.from(MAX_BALLOTS), `This user has already voted ${MAX_BALLOTS} times in this election`);
    existingElector[1].assertGreaterThanOrEqual(amount, `Existing user balance: ${existingElector[1]} is not enough for requested vote amount: ${amount}`);

    const unpackedVote1 = PartialBallot.unpack(vote.partial1.packed);
    const unpackedVote2 = PartialBallot.unpack(vote.partial2.packed);
    const ballot = this.ballot.getAndAssertEquals();
    const unpackedPartialBallot1 = PartialBallot.unpack(ballot.partial1.packed);
    const unpackedPartialBallot2 = PartialBallot.unpack(ballot.partial2.packed);

    let voteSum = UInt32.from(0);
    for (let i = 0; i < PartialBallot.l; i++) {
      voteSum = voteSum.add(unpackedVote1[i]);
      unpackedPartialBallot1[i] = unpackedPartialBallot1[i].add(unpackedVote1[i]);
      this.token.mint({
        address: PublicKey.fromBase58(PROPOSAL_VOTE_ADDRESSES[i]),
        amount: UInt64.from(unpackedVote1[i])
      });
    }
    for (let i = 0; i < PartialBallot.l; i++) {
      voteSum = voteSum.add(unpackedVote2[i]);
      unpackedPartialBallot2[i] = unpackedPartialBallot2[i].add(unpackedVote2[i]);
      this.token.mint({
        address: PublicKey.fromBase58(PROPOSAL_VOTE_ADDRESSES[i + PartialBallot.l]),
        amount: UInt64.from(unpackedVote2[i])
      });
    }
    voteSum.assertEquals(amount); // sum of votes must equal asserted amount (can vote for multiple options)
    this.token.burn({
      address: this.sender,
      amount: currentTokenBalance
    });

    const newElector = Elector.fromUInt32s([existingElector[0].add(1), existingElector[1].sub(amount)]) // incr num_ballots and decr voting balance
    this.token.mint({
      address: this.sender,
      amount: UInt64.from(newElector.packed)
    });
  }
}
