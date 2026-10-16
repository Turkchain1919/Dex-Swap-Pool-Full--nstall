/**
 * Behavior tests for the translations-PR ledger core.
 *
 * Every test drives the public functions through the `GitHistory` seam with
 * an in-memory fake — no module mocks, no spies, no subprocesses. Each case
 * exists because its failure is a real production failure: a ledger that
 * loses commits under GHA run eviction, duplicates entries across runs,
 * carries its own placeholder forward, or anchors on a garbage-collected
 * SHA.
 *
 * Run with `bun test scripts/i18n-compose-pr-body.test.ts`.
 */
import { readFileSync } from 'node:fs'
import i18nConfig from '../i18n.config'
import { describe, expect, it } from 'bun:test'
import {
  composeBody,
  deriveLedger,
  entrySha,
  extractLedger,
  type GitHistory,
  LEDGER_END,
  LEDGER_START,
  MAX_NEW_ENTRIES,
  MERGE_MARKER,
  mergeLedgers,
  PR_BRANCH,
} from './i18n-compose-pr-body'

// ---------------------------------------------------------------------------
// Real-seam fake: a GitHistory backed by plain lookup tables.
// ---------------------------------------------------------------------------

function gitFake(state: {
  /** SHAs (and short-SHA prefixes) that resolve to real commits. */
  exists?: string[]
  /** Newest merged-translations-PR commit, '' when none. */
  mergeMarkerSha?: string
  /** Newest commit touching the translations dir, '' when none. */
  translationsDirSha?: string
  /** Ledger lines returned per queried range, oldest first. */
  linesByRange?: Record<string, string[]>
}): GitHistory {
  const exists = state.exists ?? []
  return {
    commitExists: (sha) => sha !== '' && exists.some((e) => e === sha || e.startsWith(sha)),
    lastCommitMatching: () => state.mergeMarkerSha ?? '',
    lastCommitTouching: () => state.translationsDirSha ?? '',
    ledgerLinesInRange: (range) => state.linesByRange?.[range] ?? [],
  }
}

const entry = (sha: string, subject: string): string => `- \`${sha}\` ${subject}`

function bodyWithLedger(entries: string[]): string {
  return ['intro text', '', LEDGER_START, ...entries, LEDGER_END, ''].join('\n')
}

// ---------------------------------------------------------------------------
// deriveLedger — the anchor chain
// ---------------------------------------------------------------------------

describe('deriveLedger anchor chain', () => {
  it('anchors at the newest carried entry when the open PR has a ledger', () => {
    const carried = [entry('aaa1111', 'feat(swap): slippage strings'), entry('bbb2222', 'feat(pool): vault strings')]
    const derived = deriveLedger({
      existingBody: bodyWithLedger(carried),
      git: gitFake({
        exists: ['aaa1111', 'bbb2222'],
        linesByRange: { 'bbb2222..HEAD': [entry('ccc3333', 'feat(send): memo strings')] },
      }),
    })
    expect(derived.range).toBe('bbb2222..HEAD')
    expect(derived.ledger).toEqual([...carried, entry('ccc3333', 'feat(send): memo strings')])
  })

  it('falls back to the last merged translations PR when the carried anchor no longer resolves', () => {
    // A force-push (or squash rewrite) can garbage-collect the SHA the ledger
    // tail points at — the chain must recover instead of failing the run.
    const derived = deriveLedger({
      existingBody: bodyWithLedger([entry('dead000', 'gone from history')]),
      git: gitFake({
        exists: ['fffe000'],
        mergeMarkerSha: 'fffe000',
        linesByRange: { 'fffe000..HEAD': [entry('ccc3333', 'feat(send): memo strings')] },
      }),
    })
    expect(derived.range).toBe('fffe000..HEAD')
    // The unresolvable carried entry is still preserved in the body …
    expect(derived.ledger).toContain(entry('dead000', 'gone from history'))
    // … alongside the recovered window.
    expect(derived.ledger).toContain(entry('ccc3333', 'feat(send): memo strings'))
  })

  it('falls back to the last translations-dir commit when no translations PR ever merged', () => {
    const derived = deriveLedger({
      existingBody: '',
      git: gitFake({
        exists: ['abc9999'],
        translationsDirSha: 'abc9999',
        linesByRange: { 'abc9999..HEAD': [entry('ccc3333', 'feat(send): memo strings')] },
      }),
    })
    expect(derived.range).toBe('abc9999..HEAD')
    expect(derived.ledger).toEqual([entry('ccc3333', 'feat(send): memo strings')])
  })

  it('degrades to full history only when every anchor is missing', () => {
    const derived = deriveLedger({
      existingBody: '',
      git: gitFake({ linesByRange: { HEAD: [entry('ccc3333', 'first strings ever')] } }),
    })
    expect(derived.range).toBe('HEAD')
    expect(derived.ledger).toEqual([entry('ccc3333', 'first strings ever')])
  })
})

// ---------------------------------------------------------------------------
// deriveLedger — burst / eviction semantics (the reason the ledger is
// state-derived)
// ---------------------------------------------------------------------------

describe('deriveLedger under run eviction', () => {
  it('recovers commits whose triggering runs were evicted from the GHA queue', () => {
    // Runs for pushes C and D were evicted (1 in-progress + 1 pending); only
    // E's run executes. A payload-derived ledger would list E alone — the
    // state-derived window since the carried tail must list C, D, and E.
    const carried = [entry('aaa1111', 'push A'), entry('bbb2222', 'push B')]
    const window = [entry('ccc3333', 'push C'), entry('ddd4444', 'push D'), entry('eee5555', 'push E')]
    const derived = deriveLedger({
      existingBody: bodyWithLedger(carried),
      git: gitFake({ exists: ['bbb2222'], linesByRange: { 'bbb2222..HEAD': window } }),
    })
    expect(derived.ledger).toEqual([...carried, ...window])
    expect(derived.carried).toBe(2)
    expect(derived.fresh).toBe(3)
  })

  it('is idempotent when a rerun sees a window overlapping the carried entries', () => {
    // Rerun of a run whose PR update already landed: the window re-reports B.
    const carried = [entry('aaa1111', 'push A'), entry('bbb2222', 'push B')]
    const derived = deriveLedger({
      existingBody: bodyWithLedger(carried),
      git: gitFake({
        exists: ['aaa1111', 'bbb2222'],
        linesByRange: { 'bbb2222..HEAD': [entry('bbb2222', 'push B'), entry('ccc3333', 'push C')] },
      }),
    })
    expect(derived.ledger).toEqual([...carried, entry('ccc3333', 'push C')])
  })

  it('caps a runaway window at the newest MAX_NEW_ENTRIES commits', () => {
    const window = Array.from({ length: MAX_NEW_ENTRIES + 50 }, (_, i) =>
      entry(`c${String(i).padStart(6, '0')}`, `commit ${i}`),
    )
    const derived = deriveLedger({
      existingBody: '',
      git: gitFake({ exists: ['abc9999'], translationsDirSha: 'abc9999', linesByRange: { 'abc9999..HEAD': window } }),
    })
    expect(derived.fresh).toBe(MAX_NEW_ENTRIES)
    // Newest entries win: the oldest 50 are dropped, the last one survives.
    expect(derived.ledger[0]).toBe(window[50])
    expect(derived.ledger[derived.ledger.length - 1]).toBe(window[window.length - 1])
  })
})

// ---------------------------------------------------------------------------
// Parsing + merging primitives
// ---------------------------------------------------------------------------

describe('extractLedger', () => {
  it('returns no entries for a body without markers', () => {
    expect(extractLedger('a body someone hand-wrote')).toEqual([])
  })

  it('returns no entries when the markers are out of order', () => {
    expect(extractLedger(`${LEDGER_END}\n- \`aaa1111\` x\n${LEDGER_START}`)).toEqual([])
  })

  it('returns no entries for an empty marker region', () => {
    expect(extractLedger(bodyWithLedger([]))).toEqual([])
  })
})

describe('mergeLedgers', () => {
  it('keeps the first occurrence of a SHA and preserves order', () => {
    const a = entry('aaa1111', 'original subject')
    const aRetitled = entry('aaa1111', 'rebased subject wording')
    const b = entry('bbb2222', 'next')
    expect(mergeLedgers([a], [aRetitled, b])).toEqual([a, b])
  })

  it('dedupes malformed lines on full text without colliding with real entries', () => {
    const malformed = '- manual note someone typed into the body'
    expect(mergeLedgers([malformed], [malformed, entry('aaa1111', 'real')])).toEqual([
      malformed,
      entry('aaa1111', 'real'),
    ])
  })
})

describe('entrySha', () => {
  it('reads the short SHA out of a well-formed line', () => {
    expect(entrySha(entry('abc123f', 'subject with `backticks` inside'))).toBe('abc123f')
  })

  it('returns empty for lines that are not ledger entries', () => {
    expect(entrySha('- (some placeholder text)')).toBe('')
    expect(entrySha('random prose')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// composeBody ↔ extractLedger — the cross-run contract
// ---------------------------------------------------------------------------

describe('body round-trip', () => {
  it('extracts exactly the entries it composed (the carry-forward invariant)', () => {
    const ledger = [
      entry('aaa1111', 'feat(swap): slippage strings'),
      entry('bbb2222', 'fix(pool): vault copy — with unicode «and» punctuation'),
    ]
    expect(extractLedger(composeBody(ledger))).toEqual(ledger)
  })

  it('never carries the empty-ledger note forward as an entry', () => {
    // The note must live OUTSIDE the markers: a backfill run's body, re-read
    // by the next run, must contribute zero carried entries — otherwise the
    // placeholder becomes a permanent ghost entry.
    const body = composeBody([])
    expect(body).toContain('Backfill run')
    expect(extractLedger(body)).toEqual([])
  })
})

describe('marker injection', () => {
  it('defangs a commit subject that contains the end marker instead of truncating the ledger', () => {
    // External text becomes structure exactly once — here. A malicious or
    // unlucky subject must not close the marker region early.
    const hostile = `- \`aaa1111\` chore: mention ${LEDGER_END} in a subject`
    const benign = entry('bbb2222', 'normal commit')
    const roundTripped = extractLedger(composeBody([hostile, benign]))
    expect(roundTripped).toHaveLength(2)
    expect(roundTripped[1]).toBe(benign)
    expect(roundTripped[0]).not.toContain(LEDGER_END)
  })
})

describe('fresh ledger after a merge', () => {
  it('anchors at the merged PR ledger tail so commits from failed runs are recovered', () => {
    // Source commit C landed, its run failed pre-compose, the open PR
    // (covering A,B) merged. The fresh ledger must window from B — the
    // merged ledger's tail — not from the merge commit, or C vanishes.
    const mergedBody = bodyWithLedger([entry('aaa1111', 'push A'), entry('bbb2222', 'push B')])
    const derived = deriveLedger({
      existingBody: '',
      mergedBody,
      git: gitFake({
        exists: ['bbb2222', 'fffe000'],
        mergeMarkerSha: 'fffe000',
        linesByRange: {
          'bbb2222..HEAD': [entry('ccc3333', 'push C — landed during the failed run')],
          'fffe000..HEAD': [],
        },
      }),
    })
    expect(derived.range).toBe('bbb2222..HEAD')
    expect(derived.ledger).toEqual([entry('ccc3333', 'push C — landed during the failed run')])
  })

  it('prefers the open PR ledger over the merged one', () => {
    const open = bodyWithLedger([entry('ddd4444', 'push D')])
    const derived = deriveLedger({
      existingBody: open,
      mergedBody: bodyWithLedger([entry('aaa1111', 'push A')]),
      git: gitFake({ exists: ['ddd4444'], linesByRange: { 'ddd4444..HEAD': [] } }),
    })
    expect(derived.range).toBe('ddd4444..HEAD')
    expect(derived.ledger).toEqual([entry('ddd4444', 'push D')])
  })
})

// ---------------------------------------------------------------------------
// Workflow coupling: the script's anchors are literal copies of YAML strings.
// A drift breaks the ledger window silently (exit 0, wrong range) — so it
// breaks here instead.
// ---------------------------------------------------------------------------

describe('workflow coupling', () => {
  const workflow = readFileSync('.github/workflows/i18n_generate_translations.yml', 'utf8')

  it('PR_BRANCH matches the workflow branch', () => {
    // Declared once, in the workflow-level `env:` block, and inherited by
    // every step that needs it. It used to be threaded through the locate
    // step's output; that indirection is gone.
    expect(workflow).toContain(`PR_BRANCH: ${PR_BRANCH}`)
  })

  // i18n.config.ts is the source of truth for the locale paths; the workflow
  // carries literal copies in its `push:` paths filter and its
  // TRANSLATIONS_DIR env. Only the config copy fails loudly when wrong — a
  // stale paths filter just stops the pipeline triggering, silently, and a
  // stale TRANSLATIONS_DIR makes the data-only assertions exclude a directory
  // nothing writes to and pass vacuously. So assert both here.
  it('the workflow push filter and TRANSLATIONS_DIR match i18n.config.ts', () => {
    const source = i18nConfig.sources[0]!.source
    const target = i18nConfig.sources[0]!.target
    const dir = target.slice(0, target.lastIndexOf('/'))
    expect(workflow).toContain(`- ${source}`)
    expect(workflow).toContain(`TRANSLATIONS_DIR: ${dir}`)
  })

  it('MERGE_MARKER matches the PR title (squash-merge commit subjects derive from it) and the commit-message prefix', () => {
    expect(workflow).toContain(`--title '${MERGE_MARKER}'`)
    // Both commit paths: the fresh-batch one commits in the primary checkout,
    // the continue-an-open-PR one commits in a throwaway worktree via `git -C`.
    // Asserting only the first would leave the path this pipeline takes most
    // often uncoupled from the anchor.
    expect(workflow).toContain(`git commit -m '${MERGE_MARKER}`)
    expect(workflow).toContain(`git -C "$WT" commit -m '${MERGE_MARKER}`)
  })

  // The pipeline commits translation-memory shards, so the workflow env and
  // the repo's git semantics must move together. Asserted through git itself
  // (check-ignore / check-attr / ls-files), not substring matching — the
  // .gitignore comments contain the rule literals, and gitignore is
  // last-match-wins, so only git can say what the rules mean.
  it('the memory-dir env matches the gitignore, gitattributes, and glossary trackedness', () => {
    expect(workflow).toContain('I18N_MEMORY_DIR: .i18n/memory')
    const run = (cmd: string[]): number => Bun.spawnSync(cmd).exitCode
    // Committable: an ignored path would fail the commit step's `git add`.
    expect(run(['git', 'check-ignore', '-q', '.i18n/memory/es-ES.json']), 'memory shards must be committable').toBe(1)
    expect(run(['git', 'check-ignore', '-q', '.i18n/runs/x.json']), 'run artifacts must stay ignored').toBe(0)
    expect(run(['git', 'check-ignore', '-q', '.i18n/reports/x.json']), 'audit reports must stay ignored').toBe(0)
    // The re-assert step's ":(exclude)" pathspec only matches individual
    // paths while `.i18n` holds TRACKED content keeping `git status` from
    // collapsing it to one `?? .i18n/` entry — trackedness, not ignore
    // status, is the property (check-ignore is blind to it).
    expect(
      run(['git', 'ls-files', '--error-unmatch', '.i18n/glossary/core/crypto.yml']),
      'a tracked glossary keeps .i18n non-collapsible for the status exclusion',
    ).toBe(0)
    // Divergent machine-written shards must conflict loudly, never line-merge.
    const attr = Bun.spawnSync(['git', 'check-attr', 'merge', '--', '.i18n/memory/es-ES.json'])
    expect(new TextDecoder().decode(attr.stdout)).toContain('merge: binary')
  })

  // ubuntu-latest does not ship bun, and the pipeline scripts run via
  // `bun scripts/…` — so a setup-bun action must appear BEFORE the first bun
  // invocation in every workflow that calls one. This is the test that would
  // have caught the restore-step gate calling bun three steps before the
  // only install.
  it('a bun setup precedes the first bun invocation in both pipeline workflows', () => {
    for (const file of [
      '.github/workflows/i18n_generate_translations.yml',
      '.github/workflows/i18n_translation_pr_sweep.yml',
    ]) {
      const text = readFileSync(file, 'utf8')
      const setup = text.indexOf('oven-sh/setup-bun')
      const firstUse = text.search(/\bbun scripts\//)
      expect(setup, `${file} must set up bun`).toBeGreaterThan(-1)
      expect(firstUse, `${file} must actually use bun`).toBeGreaterThan(-1)
      expect(setup, `${file}: setup-bun must precede the first bun call`).toBeLessThan(firstUse)
    }
  })

  // The compose step writes the PR body where the arm script reads and edits
  // it; drift would make leaveOff replace the whole body with only its note.
  it('the arm script reads the body file the compose step writes', async () => {
    const { BODY_FILE } = await import('./i18n-pipeline/arm-auto-merge.ts')
    expect(workflow).toContain(`--out ${BODY_FILE}`)
    expect(workflow).toContain(`bun scripts/i18n-compose-pr-body.ts --out ${BODY_FILE}`)
  })

  // The on-call handle appears in the classify script and the sweep workflow;
  // a drift pages nobody (or the wrong team) silently.
  it('the on-call subteam handle matches across the classifier and the sweep', () => {
    const classifier = readFileSync('scripts/i18n-pipeline/classify-run-outcome.ts', 'utf8')
    const sweepWf = readFileSync('.github/workflows/i18n_translation_pr_sweep.yml', 'utf8')
    const handle = '<!subteam^S096XP6BGV7>'
    expect(classifier).toContain(handle)
    expect(sweepWf).toContain(handle)
  })

  // The sweep hand-copies the pipeline's branch NAMESPACE to decide which PRs
  // are the pipeline's. A rename of PR_BRANCH would leave it matching nothing
  // — and zero unattended PRs is indistinguishable from a healthy week, so the
  // nag would go quiet instead of going red. Assert the coupling here.
  it('the sweep workflow scans a prefix of the pipeline branch', () => {
    const sweep = readFileSync('.github/workflows/i18n_translation_pr_sweep.yml', 'utf8')
    const match = sweep.match(/^\s*PIPELINE_BRANCH_PREFIX:\s*'([^']+)'/m)
    expect(match?.[1]).toBeDefined()
    expect(PR_BRANCH.startsWith(match![1]!)).toBe(true)
  })
})
