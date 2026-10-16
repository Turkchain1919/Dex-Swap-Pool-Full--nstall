# Security gate context

Things in this repository that look like a security finding but are not, so the gate stops
re-reporting them. Read from the protected default branch and appended to the gate's prompts;
a pull request cannot supply its own copy.

**There are no entries yet. That is deliberate — see below before adding the first one.**

## Rules for entries

- **Security-relevant only.** An entry earns its place by having suppressed a *security*
  finding. If it would not have, it does not belong in this file.
- **Give the reason, not the verdict.** "The team accepted this" records a decision; the gate
  needs to know *why the pattern is not exploitable here* so it can tell this instance apart
  from a real one. An entry without a reason is a blanket mute.
- **Scope it as narrowly as it is true.** Name the file, function, or directory. A pattern that
  is safe in one worker is rarely safe repo-wide.
- **Only for findings the gate actually repeats.** A one-off does not cost enough reviewer time
  to be worth the risk of silencing something real.
- **Remove entries that stop being true.** A stale entry is a hole nobody is watching.

## Things that look wrong but aren't

*(none yet)*

Why this is empty: 469 gate findings over a fortnight produced 132 engineer replies, and 54 of
those began "Fixed in <sha>" — the gate was right and the code changed. Exactly one reply
disputed a finding's premise, and it turned on a feature flag's rollout state rather than a
durable property of the codebase.

The clearest case for restraint is the self-hosted-runner cluster: the gate reported the same
concern across nine pull requests, which looks like noise worth suppressing until you read the
replies. The response was "Agreed and reverted" — thirteen jobs across eight workflows moved
back to hosted runners. An entry written to quiet that repetition would have removed the finding
that caught a real regression.

Entries should come from the weekly feedback artifact once a finding is confirmed wrong, not
from guesses about what the gate might over-report.
