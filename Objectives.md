## Objectives

### Read Access to Election
- Any user can read the details of the election
- Election details are immutable after the election starts
- Any user can read election results

### Types of Voting
- One Person, One Vote
- Linear by Token Holdings
- Quadratic by Token Holdings
- Ranked-Choice
- Yes/No

### Nullifier
- Ideally it is possible to create a nullifier without 3p storage solution
- Don't know if this is possible
- If not, token-based voting could still be possible

### Live on Testworld
- Should be able to deploy an election on chain and participate, not only in dev mode

#### Out of scope
- Concurrency
  - Neither action/reducer nor protokit work on chain yet
  - Any app built without concurrency will not be viable in the real world
  - Note: Keep up to date with developments on PK and actions
- UI/UX
  - Access will be CLI-only for now