/**
 * Run with `bun test scripts/security-gate-feedback/security-gate-feedback.test.ts`.
 *
 * The emitter had no tests. It also had three bugs that only a real fortnight of data revealed --
 * an ARG_MAX overflow that silently lost 729 of 914 records, an exit-status slip that discarded a
 * whole week's artifact over one unparseable comment, and a quadratic page accumulator that meant
 * universe never once produced an artifact before its 30-minute timeout. Every one of those is a
 * property of how the script SCALES or how it FAILS, which source inspection cannot show. So these
 * tests run the script against a fake GitHub and assert on what it emitted and, just as
 * importantly, on which requests it chose to make.
 */
import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from 'bun:test'
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REPO_ROOT = join(import.meta.dir, '..', '..')
const SCRIPT = join(REPO_ROOT, 'scripts', 'security-gate-feedback', 'security-gate-feedback.sh')
const BOT = 'uniswap-security-gate[bot]'

setDefaultTimeout(30_000)

// Serves fixtures off disk by URL and appends every request to a log, so a test can assert that a
// call was NOT made -- which is the whole point of the reaction-summary guard.
const FAKE_CURL = `#!/usr/bin/env bash
url=""
for a in "$@"; do case "$a" in https://*) url="$a";; esac; done
printf '%s\\n' "$url" >> "$FAKE_LOG"
route="\${url#https://api.github.com}"
case "$route" in
  */pulls/comments\\?*page=*) f="$FAKE_DIR/page-\${route##*page=}.json" ;;
  */pulls/comments/*/reactions*) t="\${route%/reactions*}"; f="$FAKE_DIR/reactions-\${t##*/}.json" ;;
  */pulls/*) f="$FAKE_DIR/pr-\${route##*/}.json" ;;
  *) f="" ;;
esac
if [ -n "$f" ] && [ -f "$f" ]; then cat "$f"; else echo '[]'; fi
`

let fakeBin = ''

beforeAll(() => {
  fakeBin = mkdtempSync(join(tmpdir(), 'sgf-test-'))
  const curlPath = join(fakeBin, 'curl')
  writeFileSync(curlPath, FAKE_CURL)
  chmodSync(curlPath, 0o755)
})

afterAll(() => rmSync(fakeBin, { recursive: true, force: true }))

/** A gate finding comment as the LIST endpoint returns it, reaction summary included. */
function comment(over: Record<string, unknown> = {}) {
  return {
    id: 1,
    user: { login: BOT, type: 'Bot' },
    created_at: '2030-01-01T00:00:00Z',
    body: '**HIGH · injection — SQL built by concatenation**\nDetail here.',
    path: 'src/db.ts',
    line: 42,
    in_reply_to_id: null,
    pull_request_url: 'https://api.github.com/repos/o/r/pulls/7',
    reactions: { total_count: 0, '+1': 0, '-1': 0 },
    ...over,
  }
}

type Run = {
  code: number
  stdout: string
  stderr: string
  out: any
  urls: string[]
  /** The run's TMPDIR, so a test can inspect the script's scratch files. */
  dir: string
}

function runEmitter(
  fixtures: Record<string, unknown>,
  env: Record<string, string> = {},
): Run {
  const dir = mkdtempSync(join(tmpdir(), 'sgf-run-'))
  mkdirSync(dir, { recursive: true })
  for (const [name, body] of Object.entries(fixtures)) {
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(body))
  }
  const log = join(dir, 'calls.log')
  writeFileSync(log, '')
  const output = join(dir, 'out.json')

  const r = Bun.spawnSync({
    cmd: ['bash', SCRIPT],
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
      FAKE_DIR: dir,
      FAKE_LOG: log,
      // A fresh TMPDIR per run: the script keys its scratch files off TMPDIR, and a shared one
      // lets an earlier run's page/records file satisfy a later run's state.
      TMPDIR: dir,
      REPO: 'o/r',
      GH_TOKEN: 'x',
      OUTPUT: output,
      SINCE_DAYS: '3650', // fixtures are dated 2030 so the window never truncates by accident
      ...env,
    },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const dec = new TextDecoder()
  let out: any = null
  try {
    out = JSON.parse(readFileSync(output, 'utf8'))
  } catch {
    /* left null when the script exited before writing */
  }
  return {
    code: r.exitCode ?? -1,
    stdout: dec.decode(r.stdout),
    stderr: dec.decode(r.stderr),
    out,
    urls: readFileSync(log, 'utf8').split('\n').filter(Boolean),
    dir,
  }
}

const reactionCalls = (r: Run) => r.urls.filter((u) => u.includes('/reactions'))

describe('the emitter builds records from gate findings', () => {
  test('a finding becomes one record with severity, category and title parsed out', () => {
    const r = runEmitter({ 'page-1': [comment()], 'page-2': [], 'pr-7': { user: { login: 'alice' } } })

    expect(r.code).toBe(0)
    expect(r.out.totals.findings).toBe(1)
    const rec = r.out.comments[0]
    expect(rec).toMatchObject({
      prNumber: 7,
      prAuthor: 'alice',
      commentId: 1,
      path: 'src/db.ts',
      line: 42,
      severity: 'high',
      category: 'injection',
      title: 'SQL built by concatenation',
    })
  })

  test('comments from anyone other than the gate are ignored', () => {
    const r = runEmitter({
      'page-1': [comment(), comment({ id: 2, user: { login: 'human', type: 'User' } })],
      'page-2': [],
      'pr-7': { user: { login: 'alice' } },
    })

    expect(r.out.totals.findings).toBe(1)
    expect(r.out.comments[0].commentId).toBe(1)
  })
})

describe('the reaction summary in the listing removes the per-finding call', () => {
  // This is the change that took backend from ~914 sequential round-trips to a handful. It is a
  // behavioural assertion, not a benchmark: the guard is only correct if a skipped call and a
  // zero-reaction call produce the same record.
  test('a finding nobody reacted to costs no reactions request', () => {
    const r = runEmitter({ 'page-1': [comment()], 'page-2': [], 'pr-7': { user: { login: 'alice' } } })

    expect(reactionCalls(r)).toHaveLength(0)
    expect(r.out.comments[0].reactions).toMatchObject({ total: 0, thumbsUp: 0, thumbsDown: 0 })
    expect(r.out.comments[0].reactionAuthors).toEqual({ thumbsUp: [], thumbsDown: [] })
  })

  test('a finding with reactions still fetches them, for the authors the summary omits', () => {
    const r = runEmitter({
      'page-1': [comment({ reactions: { total_count: 2, '+1': 1, '-1': 1 } })],
      'page-2': [],
      'pr-7': { user: { login: 'alice' } },
      'reactions-1': [
        { content: '+1', created_at: '2030-01-02T00:00:00Z', user: { login: 'bob' } },
        { content: '-1', created_at: '2030-01-03T00:00:00Z', user: { login: 'carol' } },
      ],
    })

    expect(reactionCalls(r)).toHaveLength(1)
    expect(r.out.comments[0].reactions).toMatchObject({ total: 2, thumbsUp: 1, thumbsDown: 1 })
    // The summary carries counts but not who: this is why the call cannot be dropped entirely.
    expect(r.out.comments[0].reactionAuthors).toEqual({ thumbsUp: ['bob'], thumbsDown: ['carol'] })
  })

  test('exactly one request per reacted finding, and none for the rest', () => {
    const r = runEmitter({
      'page-1': [
        comment({ id: 1 }),
        comment({ id: 2, reactions: { total_count: 1, '+1': 1, '-1': 0 } }),
        comment({ id: 3 }),
      ],
      'page-2': [],
      'pr-7': { user: { login: 'alice' } },
      'reactions-2': [{ content: '+1', created_at: '2030-01-02T00:00:00Z', user: { login: 'bob' } }],
    })

    expect(r.out.totals.findings).toBe(3)
    expect(reactionCalls(r)).toEqual([
      'https://api.github.com/repos/o/r/pulls/comments/2/reactions?per_page=100',
    ])
  })
})

describe('a degraded reaction read is never mistaken for no reactions', () => {
  // The distinction the fallback exists to protect: "nobody engaged" and "we could not find out"
  // must not produce the same artifact, because engagement is the only thing this data measures.
  test('a failed read is counted as degraded and warned about', () => {
    const r = runEmitter({
      'page-1': [comment({ reactions: { total_count: 1, '+1': 1, '-1': 0 } })],
      'page-2': [],
      'pr-7': { user: { login: 'alice' } },
      'reactions-1': { message: 'API rate limit exceeded' }, // an object, not an array
    })

    expect(r.stdout).toContain('reaction read(s) FAILED')
    expect(r.stdout).toContain('a floor, not a measurement')
  })

  test('a zero from the listing is a known zero, so it is not degraded', () => {
    const r = runEmitter({ 'page-1': [comment()], 'page-2': [], 'pr-7': { user: { login: 'alice' } } })

    expect(r.stdout).not.toContain('FAILED')
  })

  test('the abort ratio is over reads attempted, not over findings scanned', () => {
    // The optimisation quietly defeated this guard. Skipping the call when the listing reports
    // zero means `degraded` is bounded by REACTED findings, so a ratio against every finding
    // could never trip: 4 findings, 1 reacted, that one read fails -> 1 > 4/2 is false and a run
    // that learned nothing publishes as though it had. Every fixture in the first version of this
    // file had reactions, so none of them could catch it.
    const r = runEmitter({
      'page-1': [
        comment({ id: 1 }),
        comment({ id: 2 }),
        comment({ id: 3 }),
        comment({ id: 4, reactions: { total_count: 1, '+1': 1, '-1': 0 } }),
      ],
      'page-2': [],
      'pr-7': { user: { login: 'alice' } },
      'reactions-4': { message: 'API rate limit exceeded' },
    })

    expect(r.code).toBe(1)
    expect(r.stdout).toContain('refusing to publish a misleading artifact')
  })

  test('the warning counts attempts, and says how many findings were skipped', () => {
    const r = runEmitter({
      'page-1': [
        comment({ id: 1 }),
        comment({ id: 2 }),
        comment({ id: 3, reactions: { total_count: 2, '+1': 2, '-1': 0 } }),
        comment({ id: 4, reactions: { total_count: 1, '+1': 1, '-1': 0 } }),
      ],
      'page-2': [],
      'pr-7': { user: { login: 'alice' } },
      'reactions-3': [{ content: '+1', created_at: '2030-01-02T00:00:00Z', user: { login: 'bob' } }],
      'reactions-4': { message: 'boom' },
    })

    // 1 of 2 attempted failed -- not "1 of 4", which would read as a 25% failure rate when it
    // was 50%. 1 > 2/2 is false, so this one publishes, which is the correct call.
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('1 of 2 attempted reaction read(s) FAILED')
    expect(r.stdout).toContain('4 finding(s) scanned')
  })

  test('a comment with no reaction summary at all is fetched, not assumed empty', () => {
    // An ABSENT summary is "we do not know", which is the same thing the [] fallback exists to
    // keep separate from "nobody reacted". Defaulting it to 0 would silently skip the read.
    const bare: any = comment({ id: 1 })
    delete bare.reactions
    const r = runEmitter({
      'page-1': [bare],
      'page-2': [],
      'pr-7': { user: { login: 'alice' } },
      'reactions-1': [{ content: '+1', created_at: '2030-01-02T00:00:00Z', user: { login: 'bob' } }],
    })

    expect(reactionCalls(r)).toHaveLength(1)
    expect(r.out.comments[0].reactionAuthors.thumbsUp).toEqual(['bob'])
  })

  test('refuses to publish when over half the reaction reads failed', () => {
    const r = runEmitter({
      'page-1': [
        comment({ id: 1, reactions: { total_count: 1, '+1': 1, '-1': 0 } }),
        comment({ id: 2, reactions: { total_count: 1, '+1': 1, '-1': 0 } }),
      ],
      'page-2': [],
      'pr-7': { user: { login: 'alice' } },
      // no reactions-1 / reactions-2 fixtures: the fake serves [] ... which IS a valid array, so
      // force the failure shape explicitly instead.
      'reactions-1': { message: 'boom' },
      'reactions-2': { message: 'boom' },
    })

    expect(r.code).toBe(1)
    expect(r.stdout).toContain('refusing to publish a misleading artifact')
  })
})

describe('paging accumulates without re-marshalling what it already has', () => {
  test('records from several pages all survive', () => {
    const r = runEmitter({
      'page-1': [comment({ id: 1 })],
      'page-2': [comment({ id: 2 })],
      'page-3': [comment({ id: 3 })],
      'page-4': [],
      'pr-7': { user: { login: 'alice' } },
    })

    expect(r.out.totals.findings).toBe(3)
    expect(r.out.comments.map((c: any) => c.commentId).sort()).toEqual([1, 2, 3])
  })

  test('a comment appearing on two pages yields one record', () => {
    // The listing is live and newest-first, so a comment posted mid-scan shifts everything back a
    // slot and one can land on two pages. Dedupe moved from per-page to once-at-the-end; this
    // pins that it still happens at all.
    const r = runEmitter({
      'page-1': [comment({ id: 1 })],
      'page-2': [comment({ id: 1 }), comment({ id: 2 })],
      'page-3': [],
      'pr-7': { user: { login: 'alice' } },
    })

    expect(r.out.totals.findings).toBe(2)
    expect(r.out.comments.map((c: any) => c.commentId).sort()).toEqual([1, 2])
  })

  test('paging stops once the window is passed, and does not keep requesting', () => {
    const r = runEmitter(
      {
        'page-1': [comment({ id: 1, created_at: '2030-06-01T00:00:00Z' })],
        'page-2': [comment({ id: 2, created_at: '1999-01-01T00:00:00Z' })],
        'page-3': [comment({ id: 3, created_at: '1999-01-01T00:00:00Z' })],
        'page-4': [],
        'pr-7': { user: { login: 'alice' } },
      },
      { SINCE_DAYS: '30' },
    )

    const listPages = r.urls.filter((u) => u.includes('/pulls/comments?'))
    expect(listPages).toHaveLength(2) // stopped at the page that crossed SINCE
    expect(r.out.totals.findings).toBe(1) // the 1999 comment is outside the window
  })

  test('hitting the page cap is reported as truncation, not as a complete scan', () => {
    const r = runEmitter(
      {
        'page-1': [comment({ id: 1, created_at: '2030-06-01T00:00:00Z' })],
        'page-2': [comment({ id: 2, created_at: '2030-06-01T00:00:00Z' })],
        'pr-7': { user: { login: 'alice' } },
      },
      { PAGE_CAP: '2', SINCE_DAYS: '30' },
    )

    expect(r.stdout).toContain('TRUNCATED')
  })

  test('reading the repo to the end is NOT reported as truncation', () => {
    const r = runEmitter({
      'page-1': [comment({ id: 1 })],
      'page-2': [],
      'pr-7': { user: { login: 'alice' } },
    })

    expect(r.stdout).not.toContain('TRUNCATED')
  })
})

describe('replies are indexed once rather than re-scanned per finding', () => {
  test('a reply is attached to the finding it answers', () => {
    const r = runEmitter({
      'page-1': [
        comment({ id: 1 }),
        {
          ...comment({ id: 99 }),
          user: { login: 'dave', type: 'User' },
          in_reply_to_id: 1,
          body: 'Fixed in abc123',
          created_at: '2030-01-05T00:00:00Z',
        },
      ],
      'page-2': [],
      'pr-7': { user: { login: 'alice' } },
    })

    const rec = r.out.comments.find((c: any) => c.commentId === 1)
    expect(rec.replies).toHaveLength(1)
    expect(rec.replies[0]).toMatchObject({ author: 'dave', isBot: false, body: 'Fixed in abc123' })
    expect(r.out.totals.withReplies).toBe(1)
  })

  test('the index holds only threads under gate findings, not every reply in the repo', () => {
    // Not a correctness property -- the per-finding lookup keys on comment id, so a foreign
    // thread is never returned either way. It is a SIZE property, and the only one that matters:
    // the index is re-parsed once per finding, so on backend (914 findings) an unfiltered index
    // of every reply in the fortnight would be ~1.4 GB of parsing to read a handful of replies.
    // Removing the filter passes every other test in this file, which is why this one exists.
    const r = runEmitter({
      'page-1': [
        comment({ id: 1 }),
        { ...comment({ id: 90 }), user: { login: 'dave', type: 'User' }, in_reply_to_id: 1, body: 'ours' },
        ...Array.from({ length: 20 }, (_, i) => ({
          ...comment({ id: 200 + i }),
          user: { login: 'other', type: 'User' },
          in_reply_to_id: 777,
          body: 'someone else thread',
        })),
      ],
      'page-2': [],
      'pr-7': { user: { login: 'alice' } },
    })

    // mktemp'd, so located by prefix rather than by a fixed name.
    const f = readdirSync(r.dir).find((n) => n.startsWith('sgf-replies.'))
    expect(f).toBeDefined()
    const index = JSON.parse(readFileSync(join(r.dir, f as string), 'utf8'))
    expect(Object.keys(index)).toEqual(['1'])
    expect(JSON.stringify(index)).not.toContain('someone else thread')
  })

  test('a reply to some other comment is not attached', () => {
    const r = runEmitter({
      'page-1': [
        comment({ id: 1 }),
        {
          ...comment({ id: 98 }),
          user: { login: 'dave', type: 'User' },
          in_reply_to_id: 555, // a thread that is not ours
          body: 'unrelated',
        },
      ],
      'page-2': [],
      'pr-7': { user: { login: 'alice' } },
    })

    const rec = r.out.comments.find((c: any) => c.commentId === 1)
    expect(rec.replies).toEqual([])
    expect(r.out.totals.withReplies).toBe(0)
  })
})

describe('counters survive the loop', () => {
  test('the record loop does not run in a subshell', () => {
    // `... | while read` would make the loop body a subshell and silently discard every
    // degraded/skipped increment, so both warnings would report 0 no matter how bad the scan was.
    // Asserted on the source because the symptom is an absence of output.
    const src = readFileSync(SCRIPT, 'utf8')
    expect(src).toContain('done < "$MINE_FILE"')
    expect(src).not.toMatch(/\|\s*while IFS= read -r c/)
  })

  test('a PR author is fetched once however many findings it carries', () => {
    const r = runEmitter({
      'page-1': [comment({ id: 1 }), comment({ id: 2 }), comment({ id: 3 })],
      'page-2': [],
      'pr-7': { user: { login: 'alice' } },
    })

    const prCalls = r.urls.filter((u) => /\/pulls\/7$/.test(u))
    expect(prCalls).toHaveLength(1)
    expect(r.out.comments.every((c: any) => c.prAuthor === 'alice')).toBe(true)
  })
})

describe('the page accumulator is not quadratic', () => {
  // Universe carries ~7000 review comments a fortnight and needs ~70 pages. The array form
  // re-marshalled everything collected so far on every page -- 1.06 GB through jq to gather
  // 30 MB -- and hit `timeout-minutes: 30` on every run, so universe had never produced an
  // artifact. Asserted on the source: the cost only shows at a scale no unit test should build.
  const src = () => readFileSync(SCRIPT, 'utf8')
  // Comment lines stripped before any "this pattern is gone" assertion. Both old forms are quoted
  // verbatim in the comments that explain why they were replaced, so a whole-file match finds them
  // and passes for the wrong reason -- the same trap the gate suite hit asserting on its footer.
  const code = () =>
    src()
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('#'))
      .join('\n')

  test('pages append to a file instead of being re-sorted into a variable', () => {
    expect(code()).toContain('>> "$COMMENTS_RAW"')
    expect(code()).not.toContain(`comments="$(printf '%s\\n%s' "$comments"`)
    // and the comment explaining it is still there, so the next reader knows why
    expect(src()).toContain('quadratic in pages')
  })

  test('dedupe happens once, after the loop', () => {
    const s = code()
    const loopEnd = s.indexOf('reached_window" -eq 0')
    const dedupe = s.indexOf("jq -sc 'unique_by(.id) | .[]'")
    expect(loopEnd).toBeGreaterThan(-1)
    expect(dedupe).toBeGreaterThan(loopEnd)
  })

  test('replies are not re-scanned out of the full comment set per finding', () => {
    expect(code()).not.toContain(`replies="$(printf '%s' "$comments"`)
    expect(code()).toContain('"$REPLIES_FILE"')
  })

  test('no shell variable is used as a growing accumulator any more', () => {
    // The general form of all three bugs: an accumulator held in a variable is re-marshalled on
    // every iteration. Records, pages and replies now all live in files.
    const s = code()
    expect(s).not.toMatch(/^\s*comments=/m)
    expect(s).not.toMatch(/^\s*mine=/m)
  })
})
