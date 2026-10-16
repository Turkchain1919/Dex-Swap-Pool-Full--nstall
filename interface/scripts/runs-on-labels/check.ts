#!/usr/bin/env bun
/**
 * RunsOn label guard for GitHub Actions workflows, run as a monorepo integrity
 * check (.github/actions/monorepo_integrity_checks), which gates the required
 * `CI passed` status.
 *
 * Every new or edited job must run on a RunsOn warm pool. A job that quietly
 * picks a GitHub-hosted label does not fail — it runs, bills GitHub minutes,
 * and skips the warm tier — so the only cheap place to catch it is here.
 *
 * Enforced on the ADDED lines of the PR diff only: a job whose `runs-on:` this
 * PR did not touch is left alone, so the check lands without a migration and
 * bites exactly when someone writes a new one.
 *
 * Compliant:
 *   runs-on: runs-on=${{ github.run_id }}/pool=<pool>/env=production-v3
 *
 * Also allowed:
 *   - macOS labels (`macos-latest`, `macos-26-xlarge`, …). RunsOn does not
 *     offer macOS (PR runs-on/runs-on#30743 closed), so these stay GitHub-hosted.
 *   - any job carrying `# runs-on-exempt: <reason>` on, or in the comment block
 *     directly above, its `runs-on:` line.
 *
 * Rejected:
 *   - github-hosted  ubuntu, windows, self-hosted, `group:` — no warm pool
 *   - bare-runner    `runner=`/`ami=` without `pool=` — cold-starts an
 *                    instance instead of taking a warm one
 *   - missing-env    `pool=` without `env=production-v3` — the pool label only
 *                    resolves on the stack advertising that env; the launch
 *                    fails outright at `Set up runner`
 *
 * A `runs-on:` whose value is an expression over a variable (`${{ matrix.os }}`,
 * `${{ inputs.runner }}`) carries no label this can read, so it is reported
 * `github-hosted` and needs an explicit `# runs-on-exempt:` — including over a
 * macOS matrix, which the literal-label exemption cannot see through.
 *
 * Usage:
 *   bun scripts/runs-on-labels/check.ts                    # diff the PR merge ref
 *   bun scripts/runs-on-labels/check.ts <diff-file | ->    # diff from a file or stdin
 *
 * Exit codes: 0 = clean, 2 = findings, 1 = usage or internal error. Emits
 * `::error file=...` annotations so hits show inline in Files.
 *
 * Unit tests: ./check.test.ts, run by `bun test scripts/runs-on-labels`.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

export interface Finding {
  file: string
  line: number
  rule: 'github-hosted' | 'bare-runner' | 'missing-env'
  value: string
  hint: string
}

const WORKFLOW_FILE = /^\.github\/workflows\/[^/]+\.ya?ml$/

// macos-latest, macos-14, macos-26-xlarge — RunsOn has no macOS offering.
const MACOS_LABEL = /^macos(-|$)/

const EXEMPT_MARKER = /#\s*runs-on-exempt:\s*(\S.*?)\s*$/

const REQUIRED_ENV = 'env=production-v3'

// Anchored to label boundaries: a plain substring test also accepts
// `env=production-v3-staging`, which resolves against a different stack. Built
// from REQUIRED_ENV so a bump to -v4 moves the rule, not just the hint text.
const REQUIRED_ENV_LABEL = new RegExp(`(?:^|/)${REQUIRED_ENV}(?:/|$)`)

/** Added line numbers (in the new file) per changed path, from a unified diff. */
export function parseDiff(diff: string): Map<string, Set<number>> {
  const added = new Map<string, Set<number>>()
  let file: string | null = null
  let newLine = 0
  // Header lines are only headers between files. Inside a hunk an added line
  // whose content starts with `++ ` renders as `+++ …`, which would otherwise
  // reassign `file` and orphan the rest of the hunk from the workflow filter.
  let inHunk = false

  for (const raw of diff.split('\n')) {
    if (raw.startsWith('diff ')) {
      inHunk = false
      file = null
      continue
    }
    if (!inHunk && raw.startsWith('+++ ')) {
      const path = raw.slice(4).trim().replace(/^b\//, '')
      file = path === '/dev/null' ? null : path
      continue
    }
    if (!inHunk && raw.startsWith('--- ')) continue

    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw)
    if (hunk) {
      newLine = Number(hunk[1])
      inHunk = true
      continue
    }
    if (!file) continue

    if (raw.startsWith('+')) {
      let set = added.get(file)
      if (!set) {
        set = new Set()
        added.set(file, set)
      }
      set.add(newLine)
      newLine++
    } else if (raw.startsWith('-')) {
      // A deletion is not in the new file.
    } else if (raw.startsWith(' ') || raw === '') {
      newLine++
    }
  }
  return added
}

const indentOf = (line: string): number => line.length - line.trimStart().length

export interface JobRunsOn {
  /** 1-based line of the `runs-on:` key. */
  line: number
  /**
   * 1-based last line of the value: equal to `line` for the inline form, the
   * last child line for the block form. Editing only a child line still counts
   * as touching the job, so the range is what enforcement matches against.
   */
  endLine: number
  /** Inline value, or a collapsed block form (e.g. `group: universe`). */
  value: string
  exempt: boolean
}

// `key: |`, `key: >-`, … — the body below is literal text, not YAML. The
// optional leading `-` matters: steps are list items, so the real-world form is
// `- run: |`, and without it every shell body would be walked as YAML.
const BLOCK_SCALAR_KEY = /^(?:-\s+)?[\w.'"-]+:\s*[|>][-+]?\d*\s*$/

// The same indicator as a value on its own, for `runs-on: >-`. The compliant
// label is long, so folding it is natural rather than adversarial — and it must
// be recognised as a runs-on value before BLOCK_SCALAR_KEY claims the line,
// which would drop the job from the scan and pass the gate on an unchecked job.
const BLOCK_SCALAR_VALUE = /^[|>][-+]?\d*$/

/**
 * Locate every job-level `runs-on:` in a workflow, with its line number.
 *
 * Hand-rolled rather than YAML-parsed so the guard stays dependency-free.
 * Three things make that safe enough: block scalars (`- run: |`) are skipped
 * wholesale, so a shell line reading `runs-on:` inside a script body is never
 * mistaken for a key; only keys nested under a top-level `jobs:` count; and a
 * key is only a runner label at a job's own indent, so a reusable workflow's
 * `with: { runs-on: … }` input is not mistaken for one.
 */
export function findRunsOn(source: string): JobRunsOn[] {
  const lines = source.split('\n')
  const found: JobRunsOn[] = []

  let inJobs = false
  // Indent of the job-name keys under `jobs:`, then of one job's own keys.
  // Re-measured per job rather than assumed, since indent width varies.
  let jobNameIndent: number | null = null
  let jobKeyIndent: number | null = null
  // Indent of the block-scalar key whose literal body we are skipping.
  let scalarIndent: number | null = null

  for (const [i, line] of lines.entries()) {
    const trimmed = line.trim()

    if (scalarIndent !== null) {
      // Blank lines and anything more-indented belong to the literal body.
      if (trimmed === '' || indentOf(line) > scalarIndent) continue
      scalarIndent = null
    }

    if (trimmed === '' || trimmed.startsWith('#')) continue

    const indent = indentOf(line)

    if (indent === 0) {
      inJobs = /^jobs:\s*$/.test(trimmed)
      jobNameIndent = null
      jobKeyIndent = null
      continue
    }
    if (!inJobs) continue

    if (jobNameIndent === null) {
      jobNameIndent = indent
      continue
    }
    if (indent <= jobNameIndent) {
      // Another job starts here; its own keys are measured afresh.
      jobKeyIndent = null
      continue
    }
    if (jobKeyIndent === null) jobKeyIndent = indent

    // Checked before BLOCK_SCALAR_KEY, which would otherwise claim
    // `runs-on: >-` and skip the job entirely.
    const key = indent === jobKeyIndent ? /^runs-on:\s*(.*)$/.exec(trimmed) : null
    if (key) {
      // A trailing comment defeats both value forms otherwise: on a keyless
      // `runs-on:` it leaves the comment as the value so the block children are
      // never collected, and on `runs-on: >- # note` it leaves `>-` and reports
      // a false github-hosted. `exempt` reads the raw line, so it is unaffected.
      const inline = (key[1] ?? '').replace(/(^|\s)#.*$/, '').trim()
      let value = inline
      let endLine = i + 1

      // Either a block mapping (`runs-on:` then `group: …`) or a folded scalar
      // (`runs-on: >-` then the label): in both the value is the lines below,
      // and YAML folds them on whitespace, so joining with a space is faithful.
      if (inline === '' || BLOCK_SCALAR_VALUE.test(inline)) {
        const parts: string[] = []
        for (let j = i + 1; j < lines.length; j++) {
          const child = lines[j]
          if (child === undefined) break
          if (child.trim() === '') continue
          if (indentOf(child) <= indent) break
          endLine = j + 1
          if (child.trim().startsWith('#')) continue
          parts.push(child.trim())
        }
        value = parts.join(' ')
      }

      found.push({ line: i + 1, endLine, value, exempt: isExempt(lines, i) })
      continue
    }

    if (BLOCK_SCALAR_KEY.test(trimmed)) {
      scalarIndent = indent
      continue
    }
  }
  return found
}

/** Exempt marker on the `runs-on:` line or its leading comment block. */
function isExempt(lines: string[], index: number): boolean {
  if (EXEMPT_MARKER.test(lines[index] ?? '')) return true
  for (let j = index - 1; j >= 0; j--) {
    const trimmed = (lines[j] ?? '').trim()
    if (trimmed === '') continue
    if (!trimmed.startsWith('#')) break
    if (EXEMPT_MARKER.test(trimmed)) return true
  }
  return false
}

/**
 * Split an expression on its top-level occurrences of `sep`, ignoring any
 * inside quotes or parentheses.
 */
function splitTopLevel(expr: string, sep: string): string[] {
  const parts: string[] = []
  let depth = 0
  let quote: string | null = null
  let start = 0

  for (let i = 0; i < expr.length; i++) {
    const c = expr[i]
    if (quote !== null) {
      if (c === quote) quote = null
      continue
    }
    if (c === "'" || c === '"') {
      quote = c
      continue
    }
    if (c === '(') depth++
    else if (c === ')') depth--
    else if (depth === 0 && expr.startsWith(sep, i)) {
      parts.push(expr.slice(start, i))
      i += sep.length - 1
      start = i + 1
    }
  }
  parts.push(expr.slice(start))
  return parts.map((part) => part.trim()).filter(Boolean)
}

/**
 * The labels a value-position operand can produce. `format()`'s first argument
 * is the template that becomes the label — later arguments are substituted into
 * it, so judging them as labels of their own is wrong.
 */
function operandLabels(operand: string): string[] {
  const quoted = [...operand.matchAll(/'([^']*)'|"([^"]*)"/g)].map((m) => m[1] ?? m[2] ?? '')
  // No literal at all: this resolves to a variable at runtime (`matrix.os`,
  // `inputs.runner`), so nothing here can be checked. Surfaced rather than
  // dropped — an unjudgeable branch needs an explicit exempt marker.
  if (quoted.length === 0) return [operand]
  return /\bformat\s*\(/.test(operand) ? quoted.slice(0, 1) : quoted
}

/**
 * Every label a `runs-on:` value can resolve to, one per branch the job could
 * actually launch on, so each is judged on its own — a non-compliant branch
 * must not hide behind a compliant sibling.
 *
 * GitHub's ternary idiom is `cond && ifTrue || ifFalse`, so the value positions
 * are the last `&&` operand of each top-level `||` branch. Taking only those
 * drops conditions (`github.event_name == 'push'`) without needing to
 * recognise them, and keeps branches that are bare variable references.
 */
function labelStrings(value: string): string[] {
  const expr = /^\$\{\{([\s\S]*)\}\}$/.exec(value.trim())
  // Not a whole-value expression: a literal label, or a label with `${{ }}`
  // interpolated inside it, which is judged as the single string it is.
  if (!expr) return [value]

  const candidates: string[] = []
  for (const branch of splitTopLevel(expr[1] ?? '', '||')) {
    const conjuncts = splitTopLevel(branch, '&&')
    const valuePosition = conjuncts[conjuncts.length - 1]
    if (valuePosition !== undefined) candidates.push(...operandLabels(valuePosition))
  }
  return candidates.length > 0 ? candidates : [value]
}

export function classify(value: string): Omit<Finding, 'file' | 'line'> | null {
  const stripped = value.replace(/#.*$/, '').trim()
  if (stripped === '') return null

  for (const label of labelStrings(stripped)) {
    const verdict = classifyLabel(label)
    if (verdict) return verdict
  }
  return null
}

function classifyLabel(label: string): Omit<Finding, 'file' | 'line'> | null {
  if (/\bpool=/.test(label)) {
    if (!REQUIRED_ENV_LABEL.test(label)) {
      return {
        rule: 'missing-env',
        value: label,
        hint: `pool= label must also carry ${REQUIRED_ENV}`,
      }
    }
    return null
  }

  if (/\bruns-on=/.test(label)) {
    return {
      rule: 'bare-runner',
      value: label,
      hint: 'use pool=<warm pool> instead of runner=/ami= so the job takes a warm runner',
    }
  }

  // Bare label(s): a YAML list, a `group:` block, or a single label.
  const labels = label
    .replace(/^labels:\s*/, '')
    .split(/[\s,[\]]+/)
    .map((l) => l.replace(/^["'-]+|["']+$/g, ''))
    .filter(Boolean)

  if (labels.length > 0 && labels.every((l) => MACOS_LABEL.test(l))) return null

  return {
    rule: 'github-hosted',
    value: label,
    hint: 'GitHub-hosted runners are only for macOS; use runs-on=${{ github.run_id }}/pool=<pool>/env=production-v3',
  }
}

/** A job is new or edited if the PR added any line of its `runs-on:` block. */
function isTouched(addedLines: Set<number>, job: JobRunsOn): boolean {
  for (let line = job.line; line <= job.endLine; line++) {
    if (addedLines.has(line)) return true
  }
  return false
}

export function scan(diff: string, read: (path: string) => string | null): Finding[] {
  const findings: Finding[] = []

  for (const [file, addedLines] of parseDiff(diff)) {
    if (!WORKFLOW_FILE.test(file)) continue
    const source = read(file)
    if (source === null) continue // deleted or renamed away

    for (const job of findRunsOn(source)) {
      if (!isTouched(addedLines, job)) continue
      if (job.exempt) continue
      const verdict = classify(job.value)
      if (verdict) findings.push({ file, line: job.line, ...verdict })
    }
  }
  return findings
}

const RULE_TITLE: Record<Finding['rule'], string> = {
  'github-hosted': 'job is not on a RunsOn pool',
  'bare-runner': 'job targets a runner directly instead of a warm pool',
  'missing-env': 'pool label is missing the env label',
}

export function render(findings: Finding[]): string {
  const lines: string[] = []
  for (const f of findings) {
    lines.push(`${f.file}:${f.line} — ${RULE_TITLE[f.rule]} [${f.rule}]`)
    lines.push(`  found: runs-on: ${f.value}`)
    lines.push(`  fix:   ${f.hint}`)
    lines.push('')
  }
  lines.push(
    'Every new or edited job must run on a RunsOn warm pool:',
    '',
    '  runs-on: runs-on=${{ github.run_id }}/pool=<pool>/env=production-v3',
    '',
    'macOS jobs are exempt (RunsOn has no macOS runners). For any other',
    'deliberate GitHub-hosted job, put a reason above the runs-on line:',
    '',
    '  # runs-on-exempt: <why this cannot use a pool>',
    '  runs-on: ubuntu-latest',
    '',
  )
  return lines.join('\n')
}

/**
 * The PR's net change to workflow files, taken from the merge ref: on a
 * pull_request event the checkout's first parent is the base tip and its second
 * the PR head, so `HEAD^1 HEAD` needs no base-ref fetch and works without
 * credentials (the caller checks out with `persist-credentials: false`).
 *
 * A single-parent HEAD means the caller is not on a merge ref — the step is
 * gated to `pull_request`, where `fetch-depth: 2` always provides one, so this
 * can only be caller-side drift. It fails rather than skipping: a skip would
 * turn the required check green without evaluating anything.
 */
function workflowDiffFromMergeRef(): string | null {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', 'HEAD^2'], { stdio: 'ignore' })
  } catch {
    return null
  }
  return execFileSync('git', ['diff', '--no-color', '--no-ext-diff', 'HEAD^1', 'HEAD', '--', '.github/workflows'], {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  })
}

function main(argv: string[]): number {
  const [source] = argv
  let diff: string

  if (source === undefined) {
    const fromGit = workflowDiffFromMergeRef()
    if (fromGit === null) {
      console.log(
        '::error title=RunsOn::HEAD is not a pull_request merge ref, so there is no PR diff to ' +
          'check and this gate cannot run. Check out the merge ref with fetch-depth >= 2, or pass ' +
          'a diff file explicitly.',
      )
      return 1
    }
    diff = fromGit
  } else if (source === '-') {
    diff = readFileSync(0, 'utf8')
  } else {
    diff = readFileSync(source, 'utf8')
  }

  const findings = scan(diff, (path) => (existsSync(path) ? readFileSync(path, 'utf8') : null))

  if (findings.length === 0) {
    console.log('All new and edited workflow jobs target a RunsOn pool.')
    return 0
  }

  for (const f of findings) {
    console.log(
      `::error file=${f.file},line=${f.line},title=RunsOn::${RULE_TITLE[f.rule]} — found \`${f.value}\`. ${f.hint}`,
    )
  }
  console.log(`\n${render(findings)}`)

  return 2
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)))
}
