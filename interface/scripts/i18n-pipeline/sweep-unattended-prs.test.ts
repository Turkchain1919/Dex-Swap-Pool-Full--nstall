/** The sweep's windowing, filtering, and card decisions. Run with `bun test`. */
import { describe, expect, it } from 'bun:test'
import {
  agedCandidates,
  attentionWindowStart,
  buildSlackPayload,
  escapeMrkdwn,
  humanAttention,
  parseDays,
  type OpenPr,
  type UnattendedPr,
} from './sweep-unattended-prs.ts'

const NOW = Date.parse('2026-09-10T12:00:00Z')
const daysAgo = (d: number): string => new Date(NOW - d * 86_400_000).toISOString()

function pr(over: Partial<OpenPr> & { number: number }): OpenPr {
  return {
    title: 'chore(i18n): translate new strings',
    url: `https://github.com/Uniswap/universe/pull/${over.number}`,
    draft: false,
    created_at: daysAgo(10),
    updated_at: daysAgo(1),
    head: 'ci/i18n-generate-translations',
    head_repo: 'Uniswap/universe',
    head_sha: 'abc',
    author: 'hello-happy-puppy',
    assignees: [],
    ...over,
  }
}

describe('parseDays', () => {
  it('accepts digits including leading zeros as base-10', () => {
    expect(parseDays('08')).toEqual({ days: 8, warned: false })
    expect(parseDays('010')).toEqual({ days: 10, warned: false })
  })
  it('falls back to 2 with a warning on junk', () => {
    expect(parseDays('soon')).toEqual({ days: 2, warned: true })
  })
  it('absent (schedule trigger) is a silent default', () => {
    expect(parseDays(undefined)).toEqual({ days: 2, warned: false })
  })
})

describe('agedCandidates', () => {
  const input = { repo: 'Uniswap/universe', prefix: 'ci/i18n-', cutoffMs: NOW - 2 * 86_400_000 }
  it('a fork PR wearing the pipeline branch name is invisible', () => {
    expect(agedCandidates([pr({ number: 1, head_repo: 'attacker/universe' })], input)).toEqual([])
  })
  it('a deleted fork (null head_repo) is invisible, not a crash', () => {
    expect(agedCandidates([pr({ number: 1, head_repo: null })], input)).toEqual([])
  })
  it('a fresh PR gets its grace period', () => {
    expect(agedCandidates([pr({ number: 1, created_at: daysAgo(1) })], input)).toEqual([])
  })
  it('drafts are included on purpose', () => {
    expect(agedCandidates([pr({ number: 1, draft: true })], input)).toHaveLength(1)
  })
})

describe('attention window', () => {
  it('opens at the later of head-push and cutoff', () => {
    expect(attentionWindowStart(100, 50)).toBe(100)
    expect(attentionWindowStart(50, 100)).toBe(100)
  })

  it('bots, the author, service accounts, deleted users, and stale comments never count', () => {
    const since = NOW - 86_400_000
    const humans = humanAttention(
      [
        { login: 'github-actions[bot]', type: 'Bot', at: daysAgo(0.5) },
        { login: 'uniswap-security-gate[bot]', type: 'User', at: daysAgo(0.5) },
        { login: 'hello-happy-puppy', type: 'User', at: daysAgo(0.5) },
        { login: 'HELLO-HAPPY-PUPPY', type: 'User', at: daysAgo(0.5) },
        { login: null, type: null, at: daysAgo(0.5) },
        { login: 'tony-savinova', type: 'User', at: null },
        { login: 'old-timer', type: 'User', at: daysAgo(5) },
        { login: 'just-toby', type: 'User', at: daysAgo(0.5) },
      ],
      { ignoredLogins: ['hello-happy-puppy'], sinceMs: since },
    )
    expect(humans).toEqual(['just-toby'])
  })
})

describe('slack card', () => {
  const upr = (n: number, title = 'chore(i18n): translate new strings'): UnattendedPr => ({
    ...pr({ number: n, title }),
    age_hours: 50,
    stale_hours: 3,
  })
  const opts = { oncallMention: '<!subteam^S096XP6BGV7>', days: 2, runUrl: 'https://x/runs/1', maxListed: 20 }

  it('escapes titles for mrkdwn, & first', () => {
    expect(escapeMrkdwn('a <b> & c')).toBe('a &lt;b&gt; &amp; c')
  })

  it('mention lives in the fallback text and a context block', () => {
    const payload = buildSlackPayload([upr(1)], opts)
    expect(payload.text).toContain('<!subteam^')
    expect(JSON.stringify(payload.blocks)).toContain('<!subteam^')
  })

  it('caps listed PRs and summarizes the overflow, staying under 50 blocks', () => {
    const many = Array.from({ length: 30 }, (_, i) => upr(i + 1))
    const payload = buildSlackPayload(many, opts)
    expect(payload.blocks.length).toBeLessThanOrEqual(50)
    expect(JSON.stringify(payload.blocks)).toContain('…and 10 more.')
  })

  it('a title with mrkdwn metacharacters cannot break the link out of its span', () => {
    const payload = buildSlackPayload([upr(7, 'fix <script> & <a|evil>')], opts)
    const section = JSON.stringify(payload.blocks)
    expect(section).not.toContain('<a|evil>')
    expect(section).toContain('&lt;a|evil&gt;')
  })
})
