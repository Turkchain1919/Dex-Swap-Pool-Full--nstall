/** The fail-closed decisions of the auto-merge gate. Run with `bun test`. */
import { describe, expect, it } from 'bun:test'
import { dismissesStaleApprovals, foreignCommits } from './arm-auto-merge.ts'

const SVC = 'hello-happy-puppy@uniswap.org'
const commit = (over: { author?: string; committer?: string; verified?: boolean; sha?: string }) => ({
  sha: over.sha ?? 'abcdef0123456789',
  commit: {
    author: { email: over.author ?? SVC },
    committer: { email: over.committer ?? SVC },
    verification: { verified: over.verified ?? true },
  },
})

describe('foreignCommits', () => {
  it('a fully service-authored, verified batch is clean', () => {
    const v = foreignCommits({ total_commits: 2, commits: [commit({}), commit({})] }, SVC)
    expect(v).toEqual({ kind: 'ok', foreign: [] })
  })

  it('email spoofing without a verified signature is foreign', () => {
    const v = foreignCommits({ total_commits: 1, commits: [commit({ verified: false, sha: 'deadbeef00' })] }, SVC)
    expect(v).toEqual({ kind: 'ok', foreign: ['deadbee'] })
  })

  it('a verified commit by someone else is foreign', () => {
    const v = foreignCommits({ total_commits: 1, commits: [commit({ author: 'dev@uniswap.org' })] }, SVC)
    expect(v.kind === 'ok' && v.foreign.length).toBe(1)
  })

  it('a missing verification block is foreign, not clean — fail closed', () => {
    const bare = { sha: 'cafecafe00', commit: { author: { email: SVC }, committer: { email: SVC } } }
    const v = foreignCommits({ total_commits: 1, commits: [bare] }, SVC)
    expect(v.kind === 'ok' && v.foreign.length).toBe(1)
  })

  it('a compare with no commits key (or none listed) is unknown, not clean — fail closed', () => {
    // The bash reached this only by accident (jq exit 5 on null); the port
    // must not turn an empty answer into the one verdict that arms.
    expect(foreignCommits({}, SVC)).toEqual({ kind: 'unknown' })
    expect(foreignCommits({ total_commits: 0, commits: [] }, SVC)).toEqual({ kind: 'unknown' })
  })

  it('a listed batch with no numeric total_commits is unknown — the truncation guard cannot vouch for completeness', () => {
    expect(foreignCommits({ commits: [commit({})] }, SVC)).toEqual({ kind: 'unknown' })
  })

  it("the endpoint's 250-commit truncation is unknown, not clean — fail closed", () => {
    const v = foreignCommits({ total_commits: 300, commits: [commit({})] }, SVC)
    expect(v).toEqual({ kind: 'truncated', total: 300, seen: 1 })
  })
})

describe('dismissesStaleApprovals', () => {
  it('requires BOTH dismiss-on-push and a review count ≥ 1 in one pull_request rule', () => {
    expect(
      dismissesStaleApprovals({
        rules: [{ type: 'pull_request', parameters: { dismiss_stale_reviews_on_push: true, required_approving_review_count: 1 } }],
      }),
    ).toBe(true)
    expect(
      dismissesStaleApprovals({
        rules: [{ type: 'pull_request', parameters: { dismiss_stale_reviews_on_push: true, required_approving_review_count: 0 } }],
      }),
    ).toBe(false)
    expect(
      dismissesStaleApprovals({
        rules: [{ type: 'pull_request', parameters: { dismiss_stale_reviews_on_push: false, required_approving_review_count: 2 } }],
      }),
    ).toBe(false)
  })

  it('classic branch protection is the fallback source', () => {
    expect(
      dismissesStaleApprovals({
        protection: { required_pull_request_reviews: { dismiss_stale_reviews: true, required_approving_review_count: 1 } },
      }),
    ).toBe(true)
  })

  it('no readable rules at all is a no — a 403 is a "no" like any other', () => {
    expect(dismissesStaleApprovals({})).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// main() through the Exec seam — the choreography the YAML contracts with
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'node:fs'
import { main } from './arm-auto-merge.ts'
import type { ExecResult } from './lib.ts'

function scripted(routes: Array<[match: string, result: Partial<ExecResult>]>): {
  exec: (cmd: string[]) => ExecResult
  calls: string[]
} {
  const calls: string[] = []
  return {
    calls,
    exec: (cmd: string[]): ExecResult => {
      const line = cmd.join(' ')
      calls.push(line)
      const hit = routes.find(([match]) => line.includes(match))
      return { exitCode: 0, stdout: '', stderr: '', ...(hit?.[1] ?? {}) }
    },
  }
}

function withEnv(run: () => void): void {
  const saved = { ...process.env }
  process.env.GITHUB_REPOSITORY = 'Uniswap/universe'
  process.env.PR_BRANCH = 'ci/i18n-generate-translations'
  process.env.SERVICE_ACCOUNT_EMAIL = SVC
  process.env.RESOLVED_PR = '41230'
  try {
    run()
  } finally {
    process.env = saved
  }
}

const cleanCompare = JSON.stringify({ total_commits: 1, commits: [commit({})] })

describe('main choreography', () => {
  it('a foreign commit disarms, appends the note, and rewrites the body — never arms', () => {
    writeFileSync('/tmp/i18n-pr-body.md', 'composed body\n')
    const dirty = JSON.stringify({ total_commits: 1, commits: [commit({ verified: false, sha: 'deadbeef00' })] })
    const { exec, calls } = scripted([['compare/main...', { stdout: dirty }]])
    withEnv(() => main(exec))
    expect(calls.some((c) => c.includes('merge --disable-auto 41230'))).toBe(true)
    expect(calls.some((c) => c.includes('merge --auto'))).toBe(false)
    expect(readFileSync('/tmp/i18n-pr-body.md', 'utf-8')).toContain('Auto-merge is off for this batch')
  })

  it('a clean batch with dismiss-on-push arms after refreshing the note-free body', () => {
    writeFileSync('/tmp/i18n-pr-body.md', 'composed body\n')
    const rules = JSON.stringify([
      { type: 'pull_request', parameters: { dismiss_stale_reviews_on_push: true, required_approving_review_count: 1 } },
    ])
    const { exec, calls } = scripted([
      ['compare/main...', { stdout: cleanCompare }],
      ['rules/branches/main', { stdout: rules }],
    ])
    withEnv(() => main(exec))
    expect(calls.some((c) => c.includes('merge --auto --squash 41230'))).toBe(true)
    // Ruleset answered yes — the admin-only classic endpoint is never hit.
    expect(calls.some((c) => c.includes('branches/main/protection'))).toBe(false)
  })

  it('a non-array rules body degrades to leave-off, never a thrown TypeError', () => {
    writeFileSync('/tmp/i18n-pr-body.md', 'composed body\n')
    const { exec, calls } = scripted([
      ['compare/main...', { stdout: cleanCompare }],
      ['rules/branches/main', { stdout: '{}' }],
      ['branches/main/protection', { exitCode: 1, stderr: 'HTTP 403' }],
    ])
    withEnv(() => main(exec))
    expect(calls.some((c) => c.includes('merge --disable-auto'))).toBe(true)
    expect(calls.some((c) => c.includes('merge --auto'))).toBe(false)
  })

  it('a failed compare read leaves off with the unverifiable note', () => {
    writeFileSync('/tmp/i18n-pr-body.md', 'composed body\n')
    const { exec, calls } = scripted([['compare/main...', { exitCode: 1, stderr: 'boom' }]])
    withEnv(() => main(exec))
    expect(calls.some((c) => c.includes('merge --disable-auto'))).toBe(true)
    expect(readFileSync('/tmp/i18n-pr-body.md', 'utf-8')).toContain('could not verify who produced it')
  })
})
