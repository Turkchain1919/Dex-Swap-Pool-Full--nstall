/**
 * Arm auto-merge on the translation PR, unless the batch carries commits that
 * are not the pipeline's own verified work — the security gate that decides
 * whether a batch may land with only the review-integrity floor. TypeScript
 * port of the workflow's "Arm auto-merge…" bash block; the DECISIONS are
 * unchanged and unit-tested here, which the bash never was:
 *
 * - FAILS CLOSED. Every way of not getting a trustworthy answer — compare
 *   call erroring, an unparseable body, more commits than the endpoint
 *   returns (250 cap) — takes the same path as a dirty batch: auto-merge is
 *   left (and turned) off, with a note on the PR saying why.
 * - Every branch-only commit must be the service account's as BOTH author
 *   and committer AND carry a signature GitHub verified. Email alone is
 *   forgeable metadata; `verification.verified` is the part an attacker
 *   cannot forge.
 * - Arming extends the verdict forward in time, so it also requires main to
 *   BOTH demand ≥1 approving review AND dismiss stale approvals on push —
 *   read from rulesets first, classic protection second (admin-only, a 403
 *   is a "no" like any other).
 * - The PR number is re-resolved when the commit step didn't supply one:
 *   the job-start value goes stale (a PR merged mid-run must not get its
 *   ledger overwritten with an auto-merge note). Same same-repo lookup as
 *   `Locate the open translation PR` and `Open or update the translation
 *   PR`, including the isCrossRepository fork guard — change one, change
 *   all three.
 */
import { appendFileSync } from 'node:fs'
import { annotate, gh, requireEnv, systemExec, type Exec } from './lib.ts'

export interface CompareCommit {
  sha: string
  commit: {
    author?: { email?: string }
    committer?: { email?: string }
    verification?: { verified?: boolean }
  }
}

/** Commits that are NOT the pipeline's own verified work, as short shas —
 *  or 'unknown' when the endpoint's 250-commit cap truncated the answer. */
export function foreignCommits(
  compare: { total_commits?: number; commits?: CompareCommit[] },
  serviceEmail: string,
): { kind: 'ok'; foreign: string[] } | { kind: 'truncated'; total: number; seen: number } | { kind: 'unknown' } {
  // A 200 with no commits key (or none listed) is an answer not to trust:
  // the translation branch always has at least one commit over main, so an
  // empty answer must not become the clean verdict. The bash got here by
  // accident (jq exited 5 on `.commits[]` of null and `|| leave_off` fired);
  // this is the same fail-closed on purpose.
  if (!Array.isArray(compare.commits) || compare.commits.length === 0) return { kind: 'unknown' }
  const commits = compare.commits
  // Without a numeric total the truncation guard cannot know the list is
  // complete — that is an answer not to trust, same as an empty one.
  if (typeof compare.total_commits !== 'number') return { kind: 'unknown' }
  const total = compare.total_commits
  if (total > commits.length) return { kind: 'truncated', total, seen: commits.length }
  const foreign = commits
    .filter(
      (c) =>
        c.commit.author?.email !== serviceEmail ||
        c.commit.committer?.email !== serviceEmail ||
        (c.commit.verification?.verified ?? false) !== true,
    )
    .map((c) => c.sha.slice(0, 7))
  return { kind: 'ok', foreign }
}

/** Does main BOTH require ≥1 approving review AND dismiss stale approvals on
 *  push? Both halves matter: dismiss-on-push with a review count of zero
 *  would arm auto-merge and then let a post-arming push merge on green
 *  checks with no human in the loop. */
export function dismissesStaleApprovals(input: {
  rules?: Array<{ type?: string; parameters?: { dismiss_stale_reviews_on_push?: boolean; required_approving_review_count?: number } }>
  protection?: { required_pull_request_reviews?: { dismiss_stale_reviews?: boolean; required_approving_review_count?: number } }
}): boolean {
  const byRuleset = (input.rules ?? []).some(
    (r) =>
      r.type === 'pull_request' &&
      (r.parameters?.dismiss_stale_reviews_on_push ?? false) === true &&
      (r.parameters?.required_approving_review_count ?? 0) >= 1,
  )
  if (byRuleset) return true
  const reviews = input.protection?.required_pull_request_reviews
  return (reviews?.dismiss_stale_reviews ?? false) === true && (reviews?.required_approving_review_count ?? 0) >= 1
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/** Where the compose step writes the PR body (`--out` in the workflow). The
 *  coupling test pins the two: drift would make leaveOff replace the PR body
 *  with nothing but its own note. */
export const BODY_FILE = '/tmp/i18n-pr-body.md'

function tryGh(exec: Exec, args: string[]): string | undefined {
  try {
    return gh(exec, args)
  } catch {
    return undefined
  }
}

export function main(exec: Exec = systemExec): void {
  const repo = requireEnv('GITHUB_REPOSITORY')
  const branch = requireEnv('PR_BRANCH')
  const serviceEmail = requireEnv('SERVICE_ACCOUNT_EMAIL')

  let prNumber = (process.env.RESOLVED_PR ?? '').trim()
  if (prNumber === '') {
    const listed = tryGh(exec, [
      'pr', 'list', '--repo', repo, '--head', branch, '--base', 'main', '--state', 'open',
      '--json', 'number,isCrossRepository',
      '--jq', 'map(select(.isCrossRepository | not)) | .[0].number // empty',
    ])
    if (listed === undefined) {
      annotate('warning', 'Could not re-read which translation PR is open, so auto-merge was neither armed nor disarmed this run. Nothing was changed on any PR.')
      return
    }
    prNumber = listed.trim()
    if (prNumber === '') {
      annotate('notice', 'No open translation PR any more; nothing to arm or disarm.')
      return
    }
  }

  /** Disarm + note-and-exit. Always a normal outcome, never a failed run. */
  const leaveOff = (annotation: { kind: 'warning' | 'notice'; text: string }, note: string): void => {
    annotate(annotation.kind, annotation.text)
    if (tryGh(exec, ['pr', 'merge', '--disable-auto', prNumber, '--repo', repo]) === undefined) {
      annotate('warning', `Could not disable auto-merge on PR #${prNumber} — check by hand that it is not armed.`)
    }
    // Appended after the ledger's end marker, so the next run's ledger
    // read-back ignores it; the arming path clears it by rewriting the
    // note-free composed body.
    appendFileSync(BODY_FILE, `\n> [!NOTE]\n> Auto-merge is off for this batch: ${note}\n`)
    if (tryGh(exec, ['pr', 'edit', prNumber, '--repo', repo, '--body-file', BODY_FILE]) === undefined) {
      annotate('warning', `Could not annotate PR #${prNumber} with the auto-merge note.`)
    }
  }
  const UNVERIFIABLE = 'the pipeline could not verify who produced it, so a human needs to review and merge it.'

  // Three-dot compare: exactly the commits the branch adds over main.
  const compareRaw = tryGh(exec, ['api', `repos/${repo}/compare/main...${branch}`])
  if (compareRaw === undefined) {
    return leaveOff(
      { kind: 'warning', text: `Could not read main...${branch}, so who produced this batch is unknown; failing closed and leaving auto-merge off on PR #${prNumber}.` },
      UNVERIFIABLE,
    )
  }
  let verdict: ReturnType<typeof foreignCommits>
  try {
    verdict = foreignCommits(JSON.parse(compareRaw) as Parameters<typeof foreignCommits>[0], serviceEmail)
  } catch {
    return leaveOff(
      { kind: 'warning', text: `Could not parse the compare response for ${branch}; failing closed and leaving auto-merge off on PR #${prNumber}.` },
      UNVERIFIABLE,
    )
  }
  if (verdict.kind === 'unknown') {
    return leaveOff(
      { kind: 'warning', text: `The compare of main...${branch} listed no commits, which cannot be right for an open translation PR; failing closed and leaving auto-merge off on PR #${prNumber}.` },
      UNVERIFIABLE,
    )
  }
  if (verdict.kind === 'truncated') {
    return leaveOff(
      { kind: 'warning', text: `${branch} has ${verdict.total} commits over main but the compare endpoint returned only ${verdict.seen}; failing closed and leaving auto-merge off on PR #${prNumber}.` },
      'the pipeline could not see every commit on the branch, so a human needs to review and merge it.',
    )
  }
  if (verdict.foreign.length > 0) {
    const shas = verdict.foreign.join(', ')
    return leaveOff(
      { kind: 'notice', text: `PR #${prNumber} carries commits that are not verified work of this pipeline (${shas}); leaving auto-merge OFF so a human reviews and merges this batch.` },
      `it carries commits that are not this pipeline's own verified work (${shas}), so a human needs to review and merge it.`,
    )
  }

  // Unparseable or wrong-shaped protection answers degrade to "no" (the
  // bash's DISMISS=unknown), never to a thrown TypeError that fails the job
  // after the batch is already pushed.
  const parseArray = (raw: string | undefined): unknown[] | undefined => {
    if (raw === undefined) return undefined
    try {
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : undefined
    } catch {
      return undefined
    }
  }
  const parseObject = (raw: string | undefined): Record<string, unknown> | undefined => {
    if (raw === undefined) return undefined
    try {
      const parsed: unknown = JSON.parse(raw)
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : undefined
    } catch {
      return undefined
    }
  }
  // Rulesets first; only fall back to classic protection (admin-only, may
  // 403) when they don't answer — matching the bash, and sparing every
  // armed run a noisy denied call with the PAT.
  let dismisses = dismissesStaleApprovals({
    rules: parseArray(tryGh(exec, ['api', `repos/${repo}/rules/branches/main`])) as never,
  })
  if (!dismisses) {
    dismisses = dismissesStaleApprovals({
      protection: parseObject(tryGh(exec, ['api', `repos/${repo}/branches/main/protection`])) as never,
    })
  }
  if (!dismisses) {
    return leaveOff(
      { kind: 'warning', text: `main does not report BOTH a required approving review count of at least 1 AND "Dismiss stale pull request approvals when new commits are pushed", so an approval on PR #${prNumber} would either never be required or would survive a later push to its branch; leaving auto-merge off.` },
      'main does not both require at least one approving review and dismiss it when new commits are pushed, so an approval here would either not be needed at all or would survive a later push, and auto-merge cannot be armed safely. A repo admin enabling both restores automatic merging; until then a human merges each batch.',
    )
  }

  // Pipeline-only batch, and a later push dismisses the approval: arm.
  // Rewriting from the always-composed, note-free body clears any stale
  // "auto-merge is off" note a previous run left.
  if (tryGh(exec, ['pr', 'edit', prNumber, '--repo', repo, '--body-file', BODY_FILE]) === undefined) {
    annotate('warning', `Could not refresh PR #${prNumber}'s body; an earlier "auto-merge is off" note may still be showing.`)
  }
  if (tryGh(exec, ['pr', 'merge', '--auto', '--squash', prNumber, '--repo', repo]) === undefined) {
    annotate('warning', `Could not enable auto-merge (repo setting off?) — PR #${prNumber} needs a manual merge after approval.`)
  }
}

if (import.meta.main) main()
