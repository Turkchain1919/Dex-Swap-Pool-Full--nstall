/**
 * Compose the body for the upserted translations PR, including the
 * accumulated source-commit ledger.
 *
 * The workflow (i18n_generate_translations.yml) maintains ONE open PR on a
 * stable branch; its body tracks every commit that changed the en-US source
 * file across workflow runs — the cherry-pick-flow pattern. Entries live
 * between HTML markers so they can be carried forward between runs.
 *
 * The ledger is derived from git STATE, never from a run's event payload:
 * under bursts, GHA evicts queued runs (1 in-progress + 1 pending per
 * concurrency group), and payload ranges from evicted runs would be lost —
 * history can't be. Anchor = the newest commit already covered:
 *   a. the last entry in the open PR's ledger, else
 *   b. the last entry in the most recently MERGED upsert PR's ledger — the
 *      precise covered-through marker. Anchoring at the merge commit itself
 *      would skip any source commit that landed between that PR's last
 *      successful run and its merge (its run failed pre-compose, so no
 *      ledger recorded it), else
 *   c. the last merged translations PR commit on main, else
 *   d. the last commit that touched the translations dir at all (bounds a
 *      first-ever run to a sane window instead of the file's full history).
 *
 * Structure: pure decision logic (extract/merge/derive/compose) with git
 * behind the narrow `GitHistory` seam; the `import.meta.main` shell wires
 * the real adapter (Bun.spawnSync over git/gh) and file output. Tests live
 * in i18n-compose-pr-body.test.ts and exercise the core through the seam.
 *
 * Usage: bun scripts/i18n-compose-pr-body.ts [--out <path>]
 * Env:   GH_TOKEN (PR read), GITHUB_REPOSITORY (default Uniswap/universe)
 */

import i18nConfig from '../i18n.config'

// Derived from i18n.config.ts so the paths cannot drift from the pipeline's
// own source of truth. (The workflow YAML still carries literal copies — its
// push paths filter and --reference-root — marked "must move together".)
const SOURCE_FILE = i18nConfig.sources[0]!.source
const TRANSLATIONS_DIR = i18nConfig.sources[0]!.target.slice(0, i18nConfig.sources[0]!.target.lastIndexOf('/') + 1)
// Must match the workflow's `branch:` / `title:` + `commit-message:` prefix
// (i18n_generate_translations.yml) — anchor cases (b)/(c) match on these, and
// a drift silently widens or empties the ledger window. The test asserts the
// coupling against the YAML.
export const PR_BRANCH = 'ci/i18n-generate-translations'
export const MERGE_MARKER = 'chore(i18n): translate new strings'
export const LEDGER_START = '<!-- i18n-source-commits:start -->'
export const LEDGER_END = '<!-- i18n-source-commits:end -->'
/** Newest entries win when a single window exceeds this. */
export const MAX_NEW_ENTRIES = 100

/**
 * The one seam to version control. Implementations return '' / [] for
 * "nothing found"; `commitExists('')` is always false.
 */
export interface GitHistory {
  commitExists(sha: string): boolean
  /** Full SHA of the newest commit whose message contains `substring`, or ''. */
  lastCommitMatching(substring: string): string
  /** Full SHA of the newest commit touching `path`, or ''. */
  lastCommitTouching(path: string): string
  /** Ledger-formatted lines (`- \`%h\` %s`) for source-file commits in `range`, oldest first. */
  ledgerLinesInRange(range: string): string[]
}

/** Ledger lines between the HTML markers of an existing PR body. */
export function extractLedger(body: string): string[] {
  const start = body.indexOf(LEDGER_START)
  const end = body.indexOf(LEDGER_END)
  if (start < 0 || end < 0 || end <= start) return []
  return body
    .slice(start + LEDGER_START.length, end)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

/** Short SHA of a `- \`%h\` %s` ledger line ('' when the line is malformed). */
export function entrySha(line: string): string {
  const m = line.match(/^- `([0-9a-f]+)`/)
  return m?.[1] ?? ''
}

/** Previous + new entries, deduped by SHA (malformed lines dedupe on full text), oldest first. */
export function mergeLedgers(prev: string[], next: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of [...prev, ...next]) {
    const key = entrySha(line) || line
    if (seen.has(key)) continue
    seen.add(key)
    out.push(line)
  }
  return out
}

export interface DerivedLedger {
  ledger: string[]
  range: string
  carried: number
  fresh: number
}

/**
 * The core decision: carry the open PR's entries forward, anchor the git
 * window at the newest covered commit (fallback chain in the file header),
 * and merge — so entries survive GHA evicting queued runs.
 */
export function deriveLedger(input: {
  existingBody: string
  git: GitHistory
  /** Body of the most recently MERGED upsert PR, when no PR is open. */
  mergedBody?: string
}): DerivedLedger {
  const { existingBody, git, mergedBody } = input
  const prev = extractLedger(existingBody)

  let anchor = prev.length > 0 ? entrySha(prev[prev.length - 1]!) : ''
  if (!git.commitExists(anchor) && mergedBody) {
    const merged = extractLedger(mergedBody)
    if (merged.length > 0) anchor = entrySha(merged[merged.length - 1]!)
  }
  if (!git.commitExists(anchor)) anchor = git.lastCommitMatching(MERGE_MARKER)
  if (!git.commitExists(anchor)) anchor = git.lastCommitTouching(TRANSLATIONS_DIR)

  const range = git.commitExists(anchor) ? `${anchor}..HEAD` : 'HEAD'
  const fresh = git.ledgerLinesInRange(range).slice(-MAX_NEW_ENTRIES)
  const ledger = mergeLedgers(prev, fresh)
  return { ledger, range, carried: prev.length, fresh: fresh.length }
}

/**
 * A ledger entry must never be able to close (or reopen) the marker region:
 * commit subjects are external text, and one containing the END marker would
 * truncate everything after it on the next run's read-back. Defang marker
 * substrings before they are wrapped.
 */
export function sanitizeEntry(line: string): string {
  return line.replaceAll(LEDGER_START, '&lt;i18n-source-commits:start&gt;').replaceAll(LEDGER_END, '&lt;i18n-source-commits:end&gt;')
}

/**
 * Full PR body. The markers wrap ONLY real entries — an empty ledger keeps
 * the marker region empty and notes the backfill outside it, so a later
 * run's extractLedger never carries the placeholder forward as an entry.
 */
export function composeBody(ledger: string[]): string {
  const entries = ledger.map(sanitizeEntry)
  const emptyNote = ledger.length === 0 ? ['', '_Backfill run — no source commits since the last translations merge._'] : []
  return [
    'Automated translation of untranslated strings (missing or English',
    'passthrough) by the internal AI pipeline (internal-tools `i18n-cli`),',
    'using the seed glossary + style policy with DNT masking and',
    'forbidden-term validation.',
    '',
    'Per-locale run reports (manifest, methodology, comparison) are attached',
    'to the latest workflow run as the `i18n-run-reports` artifact — review',
    'them alongside the diff. Check that the diff only contains string',
    'changes.',
    '',
    '### Source changes covered by this PR',
    '',
    LEDGER_START,
    ...entries,
    LEDGER_END,
    ...emptyNote,
    '',
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Imperative shell — real adapters + file output. Untested by design; all
// decisions live above the seam.
// ---------------------------------------------------------------------------

function exec(cmd: string[]): { ok: boolean; out: string } {
  const r = Bun.spawnSync(cmd, { stdout: 'pipe', stderr: 'pipe' })
  return { ok: r.exitCode === 0, out: new TextDecoder().decode(r.stdout).trim() }
}

export function execGitHistory(): GitHistory {
  return {
    commitExists: (sha) => sha !== '' && exec(['git', 'cat-file', '-e', `${sha}^{commit}`]).ok,
    lastCommitMatching: (substring) => exec(['git', 'log', '-1', '--format=%H', `--grep=${substring}`, 'HEAD']).out,
    lastCommitTouching: (path) => exec(['git', 'log', '-1', '--format=%H', 'HEAD', '--', path]).out,
    ledgerLinesInRange: (range) =>
      exec(['git', 'log', '--reverse', '--format=- `%h` %s', range, '--', SOURCE_FILE])
        .out.split('\n')
        .filter(Boolean),
  }
}

if (import.meta.main) {
  const outFlag = process.argv.indexOf('--out')
  const outPath = outFlag >= 0 ? process.argv[outFlag + 1]! : '/tmp/i18n-pr-body.md'
  const repo = process.env.GITHUB_REPOSITORY ?? 'Uniswap/universe'

  // isCrossRepository filter: `gh pr list --head` matches on branch NAME
  // alone, so a fork PR named ci/i18n-generate-translations would otherwise
  // land at .[0] and feed attacker-controlled body text into the ledger.
  const existing = exec([
    'gh', 'pr', 'list', '--repo', repo,
    '--head', PR_BRANCH, '--base', 'main', '--state', 'open',
    '--json', 'body,isCrossRepository', '--jq', 'map(select(.isCrossRepository | not)) | .[0].body // ""',
  ])
  const existingBody = existing.ok ? existing.out : ''

  // Fresh ledger: recover the covered-through marker from the last merged
  // upsert PR so commits whose runs failed pre-compose still enter the
  // window (see header, anchor case b).
  let mergedBody = ''
  if (extractLedger(existingBody).length === 0) {
    const merged = exec([
      'gh', 'pr', 'list', '--repo', repo,
      '--head', PR_BRANCH, '--base', 'main', '--state', 'merged',
      '--limit', '5', '--json', 'body,isCrossRepository', '--jq', 'map(select(.isCrossRepository | not)) | .[0].body // ""',
    ])
    mergedBody = merged.ok ? merged.out : ''
  }

  const derived = deriveLedger({ existingBody, git: execGitHistory(), mergedBody })
  await Bun.write(outPath, composeBody(derived.ledger))
  console.log(
    `ledger: ${derived.carried} carried + ${derived.fresh} from git (range ${derived.range}) → ${derived.ledger.length} entries`,
  )
  console.log(`body written to ${outPath}`)
}
