/**
 * Weekly sweep for translation PRs nobody has looked at — the finder behind
 * i18n_translation_pr_sweep.yml. TypeScript port of the workflow's bash/jq
 * block; the decisions are unchanged and now unit-tested:
 *
 * - Same-repo only: on a fork PR, head.ref is the fork's own branch name, so
 *   filtering on the branch alone would let anyone fork the repo, push
 *   `ci/i18n-anything`, open a PR, and page on-call. Null-safe for deleted
 *   fork repos.
 * - Attention is measured over a WINDOW opening at the LATER of the head
 *   commit's date (anything said before the last push was said about content
 *   that no longer exists) and the unattended cutoff (attention older than
 *   the threshold is an abandoned conversation).
 * - Bot reviews and bot comments are not attention — the security gate
 *   auto-approves and the review bot comments on everything. `[bot]` logins
 *   and `type: Bot` cover App identities; SERVICE_ACCOUNTS covers PAT-backed
 *   accounts GitHub reports as ordinary users; the PR's own author never
 *   counts. Deleted accounts (null login) cannot be anyone to stay quiet for.
 * - Drafts are deliberately included: a draft solicits no review at all, so
 *   it is the most likely thing to sit forgotten.
 * - The card caps listed PRs (Slack rejects >50 blocks) and escapes titles
 *   for mrkdwn (`&` first, or the entities double-escape).
 */
import { annotate, gh, requireEnv, requireIntEnv, systemExec, writeStepOutputs, type Exec } from './lib.ts'

export interface OpenPr {
  number: number
  title: string
  url: string
  draft: boolean
  created_at: string
  updated_at: string
  head: string
  head_repo: string | null
  head_sha: string
  author: string | null
  assignees: string[]
}

export interface Activity {
  login: string | null
  type: string | null
  at: string | null
}

export function parseDays(raw: string | undefined): { days: number; warned: boolean } {
  // Base-10 on purpose — the bash version guarded `10#$days` because a
  // dispatch of `08` would octal-abort and `010` would quietly mean 8.
  if (raw === undefined || !/^\d+$/.test(raw)) return { days: 2, warned: raw !== undefined && raw !== '' }
  return { days: Number.parseInt(raw, 10), warned: false }
}

export function agedCandidates(prs: OpenPr[], input: { repo: string; prefix: string; cutoffMs: number }): OpenPr[] {
  return prs.filter(
    (pr) =>
      pr.head_repo === input.repo &&
      pr.head.startsWith(input.prefix) &&
      Date.parse(pr.created_at) < input.cutoffMs,
  )
}

/** The window's opening instant: later of head-commit time and the cutoff. */
export function attentionWindowStart(headCommitMs: number, cutoffMs: number): number {
  return Math.max(headCommitMs, cutoffMs)
}

export function humanAttention(activities: Activity[], input: { ignoredLogins: string[]; sinceMs: number }): string[] {
  const ignored = new Set(input.ignoredLogins.map((l) => l.trim().toLowerCase()).filter((l) => l.length > 0))
  const humans = activities
    .filter((a) => a.login !== null && a.at !== null)
    .filter((a) => a.type !== 'Bot' && !a.login!.endsWith('[bot]'))
    .filter((a) => Date.parse(a.at!) >= input.sinceMs)
    .filter((a) => !ignored.has(a.login!.toLowerCase()))
    .map((a) => a.login!)
  return [...new Set(humans)]
}

export function escapeMrkdwn(text: string): string {
  // `&` first, or it would double-escape the entities the next two produce.
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

export function ageLabel(hours: number): string {
  return hours >= 24 ? `${Math.floor(hours / 24)}d ${hours % 24}h` : `${hours}h`
}

export interface UnattendedPr extends OpenPr {
  age_hours: number
  stale_hours: number
}

export function buildSlackPayload(
  prs: UnattendedPr[],
  input: { oncallMention: string; days: number; runUrl: string; maxListed: number },
): { text: string; blocks: unknown[] } {
  const noun = prs.length === 1 ? 'PR' : 'PRs'
  const headline = `${prs.length} i18n translation ${noun} open over ${input.days} days with no recent human attention`
  const blocks: unknown[] = [
    { type: 'header', text: { type: 'plain_text', text: `🕰️ ${headline}` } },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `🔔 cc ${input.oncallMention} — no human review or comment since whichever is more recent: the last push to the branch, or ${input.days} days ago. Bot approvals and bot comments are not counted.`,
        },
      ],
    },
    ...prs.slice(0, input.maxListed).map((pr) => ({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          `*<${pr.url}|#${pr.number} ${escapeMrkdwn(pr.title)}>*` +
          (pr.draft ? '  `DRAFT`' : '') +
          `\n*Age:* ${ageLabel(pr.age_hours)}` +
          '  ·  *Assignee:* ' +
          (pr.assignees.length > 0 ? pr.assignees.map((a) => `\`${a}\``).join(', ') : '_unassigned_') +
          `  ·  *Last activity:* ${pr.stale_hours}h ago _(bots included)_`,
      },
    })),
    ...(prs.length > input.maxListed
      ? [{ type: 'context', elements: [{ type: 'mrkdwn', text: `…and ${prs.length - input.maxListed} more.` }] }]
      : []),
    {
      type: 'actions',
      elements: [{ type: 'button', text: { type: 'plain_text', text: 'View Workflow' }, url: input.runUrl }],
    },
  ]
  return { text: `🕰️ ${headline} ${input.oncallMention}`, blocks }
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

const PR_PROJECTION =
  '.[] | {number, title, url: .html_url, draft, created_at, updated_at, head: .head.ref, head_repo: .head.repo.full_name, head_sha: .head.sha, author: .user.login, assignees: [.assignees[].login]}'

export async function main(exec: Exec = systemExec, now = new Date()): Promise<void> {
  const repo = requireEnv('GITHUB_REPOSITORY')
  const prefix = requireEnv('PIPELINE_BRANCH_PREFIX')
  // Not optional: unset, the PAT-backed service account would count as human
  // attention and quietly empty the card — the lone silent fallback the
  // review flagged next to requireEnv siblings.
  const serviceAccounts = requireEnv('SERVICE_ACCOUNTS').split(',')
  const maxListed = requireIntEnv('MAX_LISTED')

  const { days, warned } = parseDays(process.env.UNATTENDED_DAYS)
  if (warned) annotate('warning', `unattended-days '${process.env.UNATTENDED_DAYS}' is not a whole number — falling back to 2.`)
  const cutoffMs = now.getTime() - days * 86_400_000

  const open = gh(exec, ['api', '--paginate', `repos/${repo}/pulls?state=open&per_page=100`, '--jq', PR_PROJECTION])
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l) => JSON.parse(l) as OpenPr)
  const candidates = agedCandidates(open, { repo, prefix, cutoffMs })
  console.log(`Open PRs on '${prefix}*' older than ${days}d: ${candidates.length}`)

  const unattended: UnattendedPr[] = []
  for (const pr of candidates) {
    const headDate = gh(exec, [
      'api', `repos/${repo}/commits/${pr.head_sha}`, '--jq', '.commit.committer.date // .commit.author.date',
    ]).trim()
    const sinceMs = attentionWindowStart(Date.parse(headDate), cutoffMs)

    const surface = (path: string, at: string): Activity[] =>
      gh(exec, ['api', '--paginate', `repos/${repo}/${path}`, '--jq', `.[] | {login: .user.login, type: .user.type, at: .${at}}`])
        .split('\n')
        .filter((l) => l.trim() !== '')
        .map((l) => JSON.parse(l) as Activity)
    // Three surfaces a human can touch a PR through; none inferable from the others.
    const activities = [
      ...surface(`pulls/${pr.number}/reviews`, 'submitted_at'),
      ...surface(`issues/${pr.number}/comments`, 'created_at'),
      ...surface(`pulls/${pr.number}/comments`, 'created_at'),
    ]
    // A deleted PR author reads as null — nobody to stay quiet for.
    const humans = humanAttention(activities, { ignoredLogins: [pr.author ?? '', ...serviceAccounts], sinceMs })
    const sinceIso = new Date(sinceMs).toISOString()
    if (humans.length > 0) {
      console.log(`PR #${pr.number}: attended since ${sinceIso} by ${humans.join(', ')} — skipping`)
      continue
    }
    console.log(`PR #${pr.number}: no human review or comment since ${sinceIso} — reporting`)
    unattended.push({
      ...pr,
      age_hours: Math.floor((now.getTime() - Date.parse(pr.created_at)) / 3_600_000),
      // Secondary signal only — bot activity bumps updated_at, so this can
      // never decide unattendedness; it just shows staleness at a glance.
      stale_hours: Math.floor((now.getTime() - Date.parse(pr.updated_at)) / 3_600_000),
    })
  }

  writeStepOutputs({ count: String(unattended.length) })
  console.log(`Unattended: ${unattended.length}`)
  if (unattended.length === 0) {
    console.log('Nothing to report — no Slack card will be posted.')
    return
  }

  const payload = buildSlackPayload(unattended, {
    oncallMention: requireEnv('ONCALL_MENTION'),
    days,
    runUrl: requireEnv('RUN_URL'),
    maxListed,
  })
  if (payload.blocks.length === 0 || payload.blocks.length > 50) {
    throw new Error(`slack payload has ${payload.blocks.length} blocks — refusing to post a broken card`)
  }
  await Bun.write('slack-payload.json', JSON.stringify(payload, null, 2))
}

if (import.meta.main) await main()
