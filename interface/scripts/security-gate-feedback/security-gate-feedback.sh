#!/usr/bin/env bash
# Emits human feedback on security-gate findings as a JSON artifact.
#
# Deliberately a SEPARATE loop from `review-cli feedback`. Different bot, different remit, and
# the security team scores its own signal rather than having it weighted by someone else's
# scorecard. The two never touch: this uploads `security-gate-feedback`, review-cli uploads
# `review-feedback`, and each aggregator filters by artifact name.
#
# The field names deliberately mirror review-cli's wire format, because the v1->v2 diff over
# there encodes four lessons worth not re-learning: a suggestion committed verbatim is the
# strongest positive signal; a PR author's thumbs-down weighs differently from a bystander's;
# knowing who reacted is needed to tell those apart; and time-to-first-engagement separates
# "nobody looked" from "engaged immediately".
#
# NOT yet captured, and called out rather than faked:
#   - suggestionApplied: needs diffing the suggestion text against later commits.
#   - thread resolution state: needs GraphQL; the gate now resolves its own superseded threads,
#     so a resolved thread no longer means a human dismissed it and the signal is ambiguous.
# schemaVersion stays 1 until those land.
set -uo pipefail
: "${REPO:?}"; : "${GH_TOKEN:?}"
SINCE_DAYS="${SINCE_DAYS:-14}"
# Validated here rather than at the `--argjson days` that consumes it: that jq runs after
# `> "$OUTPUT"` has already truncated the artifact, so a bad dispatch input would leave an empty
# file behind. workflow_dispatch inputs are attacker-influenceable in the same way a PR title is.
case "$SINCE_DAYS" in ''|*[!0-9]*) echo "ERROR: SINCE_DAYS must be a positive integer, got '$SINCE_DAYS'"; exit 1 ;; esac
OUTPUT="${OUTPUT:-security-gate-feedback.json}"
BOT="${BOT:-uniswap-security-gate[bot]}"
GH="https://api.github.com"

api() { curl -sS "$GH$1" -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28"; }

SINCE="$(date -u -v-"${SINCE_DAYS}"d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
      || date -u -d "${SINCE_DAYS} days ago" +%Y-%m-%dT%H:%M:%SZ)"
echo "scanning $REPO for gate findings since $SINCE"

# Review comments repo-wide, newest first, rather than per-PR: one paginated endpoint instead of
# one call per PR, and it is already ordered so we can stop as soon as we pass the window.
# Page cap, bounding cost if the date break never fires. The loop exits as soon as it passes
# SINCE, so this only binds in repos busy enough that the window needs more pages -- backend
# reaches 14 days in ~10 and stops there regardless of this number. Universe needs ~70: it
# carries roughly 7000 review comments a fortnight, so 20 pages covered about six days and
# silently dropped more than half the window.
PAGE_CAP="${PAGE_CAP:-80}"
# Pages accumulate in a FILE, one comment per line, and are deduped ONCE after the loop.
#
# The array form -- comments="$(printf '%s\n%s' "$comments" "$chunk" | jq -s 'add|unique_by(.id)')"
# -- re-marshalled every comment collected so far through a shell variable and re-sorted the
# whole set on every page, so the work was quadratic in pages. Backend reaches its window in ~10
# pages and survived it; universe needs ~70 and carries ~7000 review comments a fortnight, which
# is 1.06 GB pushed through jq to collect 30 MB. Universe's emitter hit `timeout-minutes: 30` on
# every run and had never once produced an artifact.
#
# This is the same fix already applied to RECORDS below, for the same reason: an accumulator
# carried in a shell variable is a per-iteration cost, not a one-off.
COMMENTS_RAW="${COMMENTS_RAW:-$(mktemp "${TMPDIR:-/tmp}/sgf-pages.XXXXXX")}"
COMMENTS_FILE="${COMMENTS_FILE:-$(mktemp "${TMPDIR:-/tmp}/sgf-comments.XXXXXX")}"
: > "$COMMENTS_RAW"
page=1; reached_window=0
while [ "$page" -le "$PAGE_CAP" ]; do
  chunk="$(api "/repos/$REPO/pulls/comments?sort=created&direction=desc&per_page=100&page=$page")"
  printf '%s' "$chunk" | jq -e 'type=="array"' >/dev/null 2>&1 || break
  # Running out of comments means the repo was read to the END -- a complete scan, not a short
  # one. Without this the truncation warning below fired on every run in a quiet repo.
  n="$(printf '%s' "$chunk" | jq 'length')"; [ "$n" -eq 0 ] && { reached_window=1; break; }
  printf '%s' "$chunk" | jq -c '.[]' >> "$COMMENTS_RAW"
  oldest="$(printf '%s' "$chunk" | jq -r '.[-1].created_at // empty')"
  [ -n "$oldest" ] && [ "$oldest" \< "$SINCE" ] && { reached_window=1; break; }
  page=$((page+1))
done
# Exiting on the page cap rather than on the date boundary means the window was never reached and
# the scan is short. Both exits previously looked identical, so a truncated fortnight read as a
# complete one -- and asking for a longer window silently returned the same truncated data.
if [ "$reached_window" -eq 0 ]; then
  echo "WARNING: hit the ${PAGE_CAP}-page listing cap before reaching $SINCE (oldest seen: ${oldest:-none})."
  echo "         Results are TRUNCATED -- findings older than that are missing from this artifact."
fi

# unique_by(.id), once, instead of once per page: the list is ordered newest-first and is live,
# so a comment posted mid-scan shifts everything back a slot and one can land on two pages. A
# duplicate reaching the builder would emit two records for one finding.
jq -sc 'unique_by(.id) | .[]' "$COMMENTS_RAW" > "$COMMENTS_FILE"

MINE_FILE="${MINE_FILE:-$(mktemp "${TMPDIR:-/tmp}/sgf-mine.XXXXXX")}"
jq -c --arg bot "$BOT" --arg since "$SINCE" '
  select(.user.login == $bot) | select(.created_at >= $since)' "$COMMENTS_FILE" > "$MINE_FILE"
total="$(wc -l < "$MINE_FILE" | tr -d ' ')"
echo "found $total gate finding comment(s)"

# Replies, indexed ONCE by the comment they answer, and only for the gate's own comments.
#
# The previous form re-scanned the entire comment set per finding
# (`printf '%s' "$comments" | jq 'select(.in_reply_to_id == $id)'`), so backend re-parsed a 4.3 MB
# blob 914 times -- ~3.9 GB of parsing to look up a handful of replies. Restricting the index to
# threads under gate comments keeps it small enough that a per-finding lookup is free.
REPLIES_FILE="${REPLIES_FILE:-$(mktemp "${TMPDIR:-/tmp}/sgf-replies.XXXXXX")}"
jq -s --slurpfile mine "$MINE_FILE" '
  ([ $mine[].id | tostring ] | map({(.): true}) | add // {}) as $want
  | [ .[] | select(.in_reply_to_id != null)
          | select($want[(.in_reply_to_id | tostring)] == true) ]
  | group_by(.in_reply_to_id)
  | map({ key: (.[0].in_reply_to_id | tostring),
          value: [ .[] | {author: .user.login, isBot: (.user.type == "Bot"),
                          createdAt: .created_at, body: (.body[0:400])} ] })
  | from_entries' "$COMMENTS_FILE" > "$REPLIES_FILE"

# Records accumulate in a FILE, one JSON object per line, not in a shell variable. The variable
# form passed the whole array back through argv on every iteration ("jq --argjson out "$out""),
# so argv grew with the result set and crossed ARG_MAX partway through a real fortnight of
# findings: jq then failed identically for every remaining comment. 914 comments, 729 lost.
RECORDS="${RECORDS:-$(mktemp "${TMPDIR:-/tmp}/sgf-records.XXXXXX")}"
# Same TMPDIR treatment as RECORDS. Hardcoding /tmp matters more as the repo moves to reused
# RunsOn instances, where a stale file can outlive the job that wrote it.
PRCACHE="${PRCACHE:-$(mktemp "${TMPDIR:-/tmp}/sgf-prs.XXXXXX")}"
: > "$RECORDS"
# Counts comments the builder could not turn into a record. The || below keeps one malformed
# comment from killing the scan, which is right in production -- but during development it also
# turned 252 consecutive failures into a silent "emitted 0", which read as "no feedback yet"
# rather than "this is broken". A systematic breakage has to be visible in the job output.
skipped=0
# Reaction reads that FAILED rather than came back empty -- see the reactions call below.
degraded=0
# Reads ATTEMPTED, which is no longer the same as findings. Skipping the call when the listing
# already reports zero reactions means `degraded` is bounded by the number of REACTED findings,
# so keeping the abort ratio against `total` silently defeated it: 300 findings, 30 reacted, all
# 30 reads 403 gives degraded=30 and `30 > 150` is false, so a run that learned nothing at all
# publishes as though it had. The ratio has to be over what was tried.
attempted=0
printf '{}' > "$PRCACHE"   # pr number -> author, populated on first sight
# One object per line, read directly. The previous form looped over ids and re-selected each
# comment out of the whole array (`jq 'select(.id == $id)'`), re-parsing the full set once per
# finding for a value it already had in hand.
while IFS= read -r c; do
  [ -n "$c" ] || continue
  id="$(printf '%s' "$c" | jq -r '.id')"
  # The LISTING already carries a reaction summary -- {"total_count":0,"+1":0,...} -- so a
  # comment nobody reacted to needs no call at all. Most findings are in that state, and this is
  # what made the scan roughly one request per finding: 914 sequential round-trips on backend.
  #
  # This does NOT weaken the degraded-read detection below. A total_count of 0 comes from a
  # listing page that parsed as an array, so it is a KNOWN zero, not an unreadable one -- exactly
  # the distinction the fallback exists to preserve. The full call is still made whenever there
  # is anything to fetch, because the record needs each reaction's author and timestamp, which
  # the summary does not carry.
  #
  # No `// 0` default. An ABSENT summary is not a known zero -- it is the same "we could not find
  # out" the fallback below exists to keep separate, so anything that is not literally 0 falls
  # through to the full fetch. Only a summary that is present and says zero skips the call.
  rtotal="$(printf '%s' "$c" | jq -r '.reactions.total_count')"
  if [ "$rtotal" = "0" ]; then
    reactions='[]'
  else
    attempted=$((attempted+1))
    reactions="$(api "/repos/$REPO/pulls/comments/$id/reactions?per_page=100")"
    # A 403 (rate limit) or 5xx is not an array, and falling back to [] makes a DEGRADED run
    # indistinguishable from a genuinely unreacted finding: the record still builds, so it never
    # counts as skipped, and the artifact reports "0 up, 0 down" as though nobody engaged. That is
    # the one failure this data cannot afford, since measuring engagement is the whole point.
    # GITHUB_TOKEN allows 1000 requests/hour/repo, so the ceiling was reachable on a busy
    # fortnight before the guard above removed most of these calls.
    if printf '%s' "$reactions" | jq -e 'type=="array"' >/dev/null 2>&1; then :; else
      reactions='[]'; degraded=$((degraded+1))
    fi
  fi
  pr_url="$(printf '%s' "$c" | jq -r '.pull_request_url')"
  pr_num="${pr_url##*/}"
  # Cache the PR lookup. Findings cluster heavily on a few PRs -- one had 32 -- so without this
  # the scan makes a redundant /pulls/{n} call per finding instead of per PR, and a fortnight of
  # backend traffic does not finish inside the job timeout.
  pr_author="$(jq -r --arg k "$pr_num" '.[$k] // empty' "$PRCACHE" 2>/dev/null)"
  if [ -z "$pr_author" ]; then
    pr_author="$(api "/repos/$REPO/pulls/$pr_num" | jq -r '.user.login // ""')"
    jq --arg k "$pr_num" --arg v "$pr_author" '.[$k] = $v' "$PRCACHE" > "$PRCACHE.tmp" 2>/dev/null \
      && mv "$PRCACHE.tmp" "$PRCACHE"
  fi
  # Replies live in the same thread: same PR, in_reply_to_id pointing at this comment. Read from
  # the index built once above rather than re-scanning every comment in the repo per finding.
  replies="$(jq -c --arg k "$id" '.[$k] // []' "$REPLIES_FILE")"
  rec="$(jq -nc --argjson c "$c" --argjson r "$reactions" \
              --argjson replies "$replies" --argjson prnum "$pr_num" \
              --arg prauthor "$pr_author" '
    ($r | map(.content)) as $kinds
    | ($c.body | split("\n")[0]) as $head
    | {
        prNumber: $prnum,
        prAuthor: $prauthor,
        commentId: $c.id,
        createdAt: $c.created_at,
        path: $c.path,
        line: ($c.line // $c.original_line),
        # "**MEDIUM · injection — Title**" — severity and category are rendered into the
        # comment head by the gate, so the aggregator can group without re-deriving them.
        # Every field ends in // so an unmatched head cannot collapse the object. capture emits
        # an EMPTY STREAM when the pattern does not match -- not an error, so try/catch is the
        # wrong tool and // is the right one. A head that is not "**SEV . category -- Title**"
        # (one written before categories existed, or a later format change) must still be
        # counted, with the parts we could not read left null.
        severity: (($head | capture("\\*\\*(?<s>[A-Z]+)") | .s | ascii_downcase) // null),
        category: (($head | capture(" · (?<c>[a-z-]+) ") | .c) // "uncategorised"),
        title: (($head | sub("^\\*\\*[^—]*— ";"") | sub("\\*\\*$";"")) // $head),
        reactions: {
          total: ($kinds | length),
          thumbsUp: ([$kinds[] | select(. == "+1")] | length),
          thumbsDown: ([$kinds[] | select(. == "-1")] | length),
          confused: ([$kinds[] | select(. == "confused")] | length),
          eyes: ([$kinds[] | select(. == "eyes")] | length),
          heart: ([$kinds[] | select(. == "heart")] | length),
          rocket: ([$kinds[] | select(. == "rocket")] | length)
        },
        reactionAuthors: {
          thumbsUp: [ $r[] | select(.content == "+1") | .user.login ],
          thumbsDown: [ $r[] | select(.content == "-1") | .user.login ]
        },
        replies: $replies,
        firstEngagementAt: ((($r | map(.created_at)) + ($replies | map(.createdAt))) | sort | first)
      }' 2>/dev/null)"
  # A record that fails to build is counted and dropped; it can no longer corrupt the ones
  # already written, which is what the carried-array form did once argv overflowed.
  if [ -n "$rec" ]; then printf '%s\n' "$rec" >> "$RECORDS"; else skipped=$((skipped+1)); fi
# Redirection, NOT a pipe. `... | while read` runs the loop body in a subshell, so every
# `skipped`/`degraded` increment would be discarded at `done` and both warnings below would
# report 0 no matter how badly the scan went.
done < "$MINE_FILE"

jq -n --arg repo "$REPO" --arg since "$SINCE" --argjson days "$SINCE_DAYS" --slurpfile c "$RECORDS" \
  --arg at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '
  { schemaVersion: 1, repo: $repo, generatedAt: $at, sinceDays: $days, since: $since,
    totals: {
      findings: ($c | length),
      withAnyReaction: ([ $c[] | select(.reactions.total > 0) ] | length),
      thumbsUp: ([ $c[] | .reactions.thumbsUp ] | add // 0),
      thumbsDown: ([ $c[] | .reactions.thumbsDown ] | add // 0),
      withReplies: ([ $c[] | select(.replies | length > 0) ] | length)
    },
    comments: $c }' > "$OUTPUT"

jq -r '"emitted \(.totals.findings) finding(s): \(.totals.thumbsUp) up, \(.totals.thumbsDown) down, \(.totals.withReplies) with replies"' "$OUTPUT"
if [ "$degraded" -gt 0 ]; then
  echo "WARNING: $degraded of $attempted attempted reaction read(s) FAILED and were recorded as no-reaction."
  echo "         ($total finding(s) scanned; the rest reported zero reactions in the listing.)"
  echo "         Reaction counts in this artifact are a floor, not a measurement."
  if [ "$degraded" -gt $((attempted / 2)) ]; then
    echo "ERROR: over half the reaction reads failed -- refusing to publish a misleading artifact"
    exit 1
  fi
fi
if [ "$skipped" -gt 0 ]; then
  echo "WARNING: $skipped of $total comment(s) could not be parsed into a record"
  # A handful is noise; most of them means the comment format moved and the scan is now blind.
  # `if`, not `[ ... ] && { ... }`: as the script's last command the && form returns the failed
  # test's status, so a single tolerated skip exited 1, failed the step, and skipped
  # upload-artifact (default `if: success()`) -- losing the whole week's artifact over one
  # unparseable comment, the exact opposite of "a handful is noise".
  if [ "$skipped" -gt $((total / 2)) ]; then
    echo "ERROR: over half the comments failed to parse"
    exit 1
  fi
fi
