/**
 * Run with `bun test scripts/runs-on-labels`.
 *
 * This guard gates the required `CI passed` status on every PR, and root
 * `scripts/` is invisible to nx affected, so the suite is wired into
 * monorepo_code_quality_checks.yml to always run.
 */

import { describe, expect, test } from 'bun:test'
import { classify, findRunsOn, parseDiff, scan } from './check'

const POOL = 'runs-on=${{ github.run_id }}/pool=universe-monorepo-pool-v3/env=production-v3'

const ruleOf = (value: string) => classify(value)?.rule ?? null

describe('classify', () => {
  test.each([
    ['compliant pool', POOL, null],
    ['pool without env', 'runs-on=${{ github.run_id }}/pool=universe-monorepo-pool-v3', 'missing-env'],
    ['bare runner=', 'runs-on=${{ github.run_id }}/runner=canary/env=production-v3', 'bare-runner'],
    ['bare ami=', 'runs-on=${{ github.run_id }}/ami=ami-075b/env=production-v3', 'bare-runner'],
    ['ubuntu-latest', 'ubuntu-latest', 'github-hosted'],
    ['windows-latest', 'windows-latest', 'github-hosted'],
    ['self-hosted', 'self-hosted', 'github-hosted'],
    ['group: block', 'group: universe', 'github-hosted'],
    ['labels: block', 'labels: ubuntu-latest', 'github-hosted'],
    ['macos-latest', 'macos-latest', null],
    ['macos-26-xlarge', 'macos-26-xlarge', null],
    ['all-macOS list', '[macos-14, macos-15]', null],
    ['mixed macOS and ubuntu list', '[macos-14, ubuntu-latest]', 'github-hosted'],
    ['empty value', '', null],
  ] as const)('%s', (_name, value, expected) => {
    expect(ruleOf(value)).toBe(expected)
  })

  // A plain substring test also accepts a sibling stack's env label.
  describe('the env label is matched at label boundaries', () => {
    test.each([
      ['exact', 'runs-on=x/pool=p/env=production-v3', null],
      ['env in the middle', 'runs-on=x/env=production-v3/pool=p', null],
      ['staging suffix', 'runs-on=x/pool=p/env=production-v3-staging', 'missing-env'],
      ['prefixed env key', 'runs-on=x/pool=p/notenv=production-v3', 'missing-env'],
    ] as const)('%s', (_name, value, expected) => {
      expect(ruleOf(value)).toBe(expected)
    })

    // The enforcing regex is built from REQUIRED_ENV rather than repeating the
    // literal, so a version bump cannot move the hint text without the rule.
    test('the hint names the same env label the rule enforces', () => {
      const hint = classify('runs-on=x/pool=p')?.hint ?? ''
      const env = /env=[\w.-]+/.exec(hint)?.[0] ?? ''
      expect(env).not.toBe('')
      expect(ruleOf(`runs-on=x/pool=p/${env}`)).toBeNull()
    })
  })

  test('trailing comment is not part of the value', () => {
    expect(ruleOf(`${POOL} # 8 vCPU`)).toBeNull()
  })

  // Each branch of a conditional is a label the job can actually launch on, so
  // a non-compliant branch must not hide behind a compliant sibling's env=.
  describe('conditional expressions are judged per branch', () => {
    const conditional = (a: string, b: string) =>
      `\${{ github.event_name == 'push' && format('${a}', github.run_id) || format('${b}', github.run_id) }}`

    test('both branches compliant', () => {
      expect(
        ruleOf(conditional('runs-on={0}/pool=big-v3/env=production-v3', 'runs-on={0}/pool=light-v3/env=production-v3')),
      ).toBeNull()
    })

    test('first branch missing env', () => {
      expect(
        ruleOf(conditional('runs-on={0}/pool=big-v3', 'runs-on={0}/pool=light-v3/env=production-v3')),
      ).toBe('missing-env')
    })

    test('second branch missing env', () => {
      expect(
        ruleOf(conditional('runs-on={0}/pool=big-v3/env=production-v3', 'runs-on={0}/pool=light-v3')),
      ).toBe('missing-env')
    })

    test('one branch is a bare runner', () => {
      expect(
        ruleOf(conditional('runs-on={0}/pool=big-v3/env=production-v3', 'runs-on={0}/runner=canary/env=production-v3')),
      ).toBe('bare-runner')
    })

    // Keeping only RunsOn-shaped branches let a plain hosted branch through
    // unjudged; keeping every quoted string would judge `'push'` as a label.
    test('a plain hosted branch is judged, not skipped', () => {
      expect(
        ruleOf("${{ c && 'ubuntu-latest' || format('runs-on={0}/pool=p-v3/env=production-v3', github.run_id) }}"),
      ).toBe('github-hosted')
    })

    test('a hosted branch is caught in either branch order', () => {
      expect(
        ruleOf("${{ c && format('runs-on={0}/pool=p-v3/env=production-v3', github.run_id) || 'ubuntu-latest' }}"),
      ).toBe('github-hosted')
    })

    test("a comparison operand is not mistaken for a label", () => {
      expect(
        ruleOf(
          "${{ github.event_name == 'push' && format('runs-on={0}/pool=a-v3/env=production-v3', github.run_id) || format('runs-on={0}/pool=b-v3/env=production-v3', github.run_id) }}",
        ),
      ).toBeNull()
    })

    // GitHub's idiom is `cond && ifTrue || ifFalse`, so only the last `&&`
    // operand of each `||` branch is a label. A branch that is a bare variable
    // has no readable label and must be surfaced, not dropped.
    test('a branch that is a bare variable reference is surfaced', () => {
      expect(ruleOf("${{ inputs.warm && 'runs-on=x/pool=p-v3/env=production-v3' || matrix.runner }}")).toBe(
        'github-hosted',
      )
    })

    test('a bare variable in the true-slot is surfaced too', () => {
      expect(
        ruleOf("${{ c && matrix.runner || format('runs-on={0}/pool=p-v3/env=production-v3', github.run_id) }}"),
      ).toBe('github-hosted')
    })

    test('a multi-condition guard is not mistaken for a label', () => {
      expect(
        ruleOf(
          "${{ a == 'x' && b != 'y' && format('runs-on={0}/pool=a-v3/env=production-v3', github.run_id) || format('runs-on={0}/pool=b-v3/env=production-v3', github.run_id) }}",
        ),
      ).toBeNull()
    })

    test("format()'s substituted arguments are not judged as labels", () => {
      expect(
        ruleOf(
          "${{ c && format('runs-on={0}/pool={1}/env=production-v3', github.run_id, 'p-v3') || format('runs-on={0}/pool=b-v3/env=production-v3', github.run_id) }}",
        ),
      ).toBeNull()
    })

    test('the reported value is the offending branch, not the whole expression', () => {
      const finding = classify(
        conditional('runs-on={0}/pool=big-v3', 'runs-on={0}/pool=light-v3/env=production-v3'),
      )
      expect(finding?.value).toBe('runs-on={0}/pool=big-v3')
    })
  })

  // An expression over a variable carries no label to read, so it is reported
  // and needs an explicit exempt marker — macOS matrices included.
  test.each(['${{ matrix.os }}', '${{ inputs.runner }}'])('expression-valued %s is reported', (value) => {
    expect(ruleOf(value)).toBe('github-hosted')
  })
})

describe('findRunsOn', () => {
  test('finds the inline form with its line number', () => {
    const workflow = ['name: w', 'jobs:', '  a:', `    runs-on: ${POOL}`].join('\n')
    expect(findRunsOn(workflow)).toEqual([{ line: 4, endLine: 4, value: POOL, exempt: false }])
  })

  test('collapses the block form onto one value and spans its child lines', () => {
    const workflow = ['jobs:', '  a:', '    runs-on:', '      group: universe'].join('\n')
    expect(findRunsOn(workflow)).toEqual([{ line: 3, endLine: 4, value: 'group: universe', exempt: false }])
  })

  test('ignores a top-level runs-on outside jobs:', () => {
    const workflow = ['on:', '  workflow_call:', '    inputs:', '      runs-on: ubuntu-latest'].join('\n')
    expect(findRunsOn(workflow)).toEqual([])
  })

  // Steps are YAML list items, so the real-world block-scalar form is
  // `- run: |`. Before this was handled, shell bodies were walked as YAML and a
  // body line starting with `runs-on:` was reported as a job key.
  describe('block scalar bodies are not YAML', () => {
    const withBody = (body: string[]) =>
      ['jobs:', '  a:', `    runs-on: ${POOL}`, '    steps:', '      - run: |', ...body].join('\n')

    test('a body line starting with runs-on: is not a job key', () => {
      const jobs = findRunsOn(withBody(['          runs-on: ubuntu-latest', '          echo done']))
      expect(jobs.map((j) => j.value)).toEqual([POOL])
    })

    test('a body line merely containing runs-on: is not a job key', () => {
      const jobs = findRunsOn(withBody(['          grep runs-on: file.yml']))
      expect(jobs.map((j) => j.value)).toEqual([POOL])
    })

    test('the folded form >- is skipped too', () => {
      const workflow = [
        'jobs:',
        '  a:',
        `    runs-on: ${POOL}`,
        '    steps:',
        '      - name: s',
        '        run: >-',
        '          runs-on: ubuntu-latest',
      ].join('\n')
      expect(findRunsOn(workflow).map((j) => j.value)).toEqual([POOL])
    })

    // A block-scalar indicator as the runs-on value must be read as a runs-on
    // key, not swallowed as an unrelated scalar body — swallowing it drops the
    // job from the scan and passes the gate on a job nobody checked.
    describe('runs-on: as a folded scalar', () => {
      const folded = (label: string) => ['jobs:', '  a:', '    runs-on: >-', `      ${label}`].join('\n')

      test('a folded compliant label is found and accepted', () => {
        const jobs = findRunsOn(folded(POOL))
        expect(jobs).toEqual([{ line: 3, endLine: 4, value: POOL, exempt: false }])
        expect(classify(jobs[0]?.value ?? '')).toBeNull()
      })

      test('a folded hosted label is still caught', () => {
        const jobs = findRunsOn(folded('ubuntu-latest'))
        expect(jobs.map((j) => j.value)).toEqual(['ubuntu-latest'])
        expect(ruleOf(jobs[0]?.value ?? '')).toBe('github-hosted')
      })

      test('the literal block form | behaves the same', () => {
        const jobs = findRunsOn(['jobs:', '  a:', '    runs-on: |', '      ubuntu-latest'].join('\n'))
        expect(jobs.map((j) => j.value)).toEqual(['ubuntu-latest'])
      })
    })

    // A trailing comment used to defeat both value forms: on a keyless
    // `runs-on:` it became the value so children were never collected (the job
    // escaped), and on `runs-on: >- #` it left `>-` (a false positive).
    describe('a trailing comment on the runs-on line', () => {
      test('does not stop a keyless runs-on collecting its block', () => {
        const workflow = ['jobs:', '  a:', '    runs-on: # vercel deploy runners', '      group: deploy'].join('\n')
        expect(findRunsOn(workflow).map((j) => j.value)).toEqual(['group: deploy'])
        expect(ruleOf('group: deploy')).toBe('github-hosted')
      })

      test('does not turn a folded compliant label into a false positive', () => {
        const workflow = ['jobs:', '  a:', '    runs-on: >- # 8 vCPU', `      ${POOL}`].join('\n')
        const jobs = findRunsOn(workflow)
        expect(jobs.map((j) => j.value)).toEqual([POOL])
        expect(classify(jobs[0]?.value ?? '')).toBeNull()
      })

      test('leaves an inline exempt marker working', () => {
        const workflow = ['jobs:', '  a:', '    runs-on: ubuntu-latest # runs-on-exempt: vendor allowlist'].join('\n')
        expect(findRunsOn(workflow)[0]?.exempt).toBe(true)
      })
    })

    test('a real runs-on after a scalar body is still found', () => {
      const workflow = [
        'jobs:',
        '  a:',
        `    runs-on: ${POOL}`,
        '    steps:',
        '      - run: |',
        '          echo hi',
        '  b:',
        '    runs-on: ubuntu-latest',
      ].join('\n')
      expect(findRunsOn(workflow).map((j) => [j.line, j.value])).toEqual([
        [3, POOL],
        [8, 'ubuntu-latest'],
      ])
    })
  })

  // `runs-on:` is a runner label only at a job's own indent. One level deeper
  // it is an input to something else, and flagging it leaves no way out but an
  // exempt marker on a line that isn't a runner label at all.
  describe('only job-level runs-on: counts', () => {
    test('a reusable-workflow with: input is not a job label', () => {
      const workflow = [
        'jobs:',
        '  a:',
        '    uses: ./.github/workflows/x.yml',
        '    with:',
        '      runs-on: ubuntu-latest',
      ].join('\n')
      expect(findRunsOn(workflow)).toEqual([])
    })

    test('a step input named runs-on is not a job label', () => {
      const workflow = [
        'jobs:',
        '  a:',
        `    runs-on: ${POOL}`,
        '    steps:',
        '      - uses: ./.github/actions/x',
        '        with:',
        '          runs-on: ubuntu-latest',
      ].join('\n')
      expect(findRunsOn(workflow).map((j) => j.value)).toEqual([POOL])
    })

    test('a job label is still found alongside a nested one', () => {
      const workflow = [
        'jobs:',
        '  a:',
        '    runs-on: ubuntu-latest',
        '    with:',
        '      runs-on: macos-latest',
        '  b:',
        `    runs-on: ${POOL}`,
      ].join('\n')
      expect(findRunsOn(workflow).map((j) => [j.line, j.value])).toEqual([
        [3, 'ubuntu-latest'],
        [7, POOL],
      ])
    })

    test('indent width is measured per file, not assumed', () => {
      const workflow = ['jobs:', '    a:', '        runs-on: ubuntu-latest'].join('\n')
      expect(findRunsOn(workflow).map((j) => j.value)).toEqual(['ubuntu-latest'])
    })
  })

  describe('exempt markers', () => {
    const exemptOf = (lines: string[]) => findRunsOn(lines.join('\n'))[0]?.exempt

    test('inline on the runs-on line', () => {
      expect(exemptOf(['jobs:', '  a:', '    runs-on: ubuntu-latest # runs-on-exempt: vendor allowlist'])).toBe(true)
    })

    test('in the comment block directly above', () => {
      expect(
        exemptOf([
          'jobs:',
          '  a:',
          '    # runs-on-exempt: needs a GitHub-hosted IP allowlisted by the vendor',
          '    runs-on: ubuntu-latest',
        ]),
      ).toBe(true)
    })

    test('anywhere in a multi-line comment block above', () => {
      expect(
        exemptOf([
          'jobs:',
          '  a:',
          '    # runs-on-exempt: documented reason',
          '    # a second comment line in the same block',
          '    runs-on: ubuntu-latest',
        ]),
      ).toBe(true)
    })

    test('a marker with no reason is not an exemption', () => {
      expect(exemptOf(['jobs:', '  a:', '    # runs-on-exempt:', '    runs-on: ubuntu-latest'])).toBe(false)
    })

    test('a marker does not carry across an intervening key', () => {
      expect(
        exemptOf([
          'jobs:',
          '  a:',
          '    # runs-on-exempt: stale marker on another key',
          '    timeout-minutes: 5',
          '    runs-on: ubuntu-latest',
        ]),
      ).toBe(false)
    })
  })
})

describe('parseDiff', () => {
  // Pins the line arithmetic: the hunk header seeds the new-file counter,
  // context and additions advance it, deletions do not.
  test('maps added lines to their new-file line numbers', () => {
    const diff = [
      'diff --git a/.github/workflows/w.yml b/.github/workflows/w.yml',
      '--- a/.github/workflows/w.yml',
      '+++ b/.github/workflows/w.yml',
      '@@ -1,4 +1,5 @@',
      ' jobs:',
      '   old:',
      '-    runs-on: ubuntu-20.04',
      '+    runs-on: ubuntu-latest',
      '+  new:',
      '     timeout-minutes: 5',
    ].join('\n')
    const added = parseDiff(diff).get('.github/workflows/w.yml')
    expect([...(added ?? [])].sort((a, b) => a - b)).toEqual([3, 4])
  })

  test('a second hunk reseeds the counter', () => {
    const diff = [
      '+++ b/.github/workflows/w.yml',
      '@@ -1,2 +1,3 @@',
      ' jobs:',
      '+  a:',
      '@@ -20,2 +21,3 @@',
      ' steps:',
      '+  - run: echo',
    ].join('\n')
    const added = parseDiff(diff).get('.github/workflows/w.yml')
    expect([...(added ?? [])].sort((a, b) => a - b)).toEqual([2, 22])
  })

  // An added line whose content starts with `++ ` renders as `+++ …`. Treated
  // as a header it reassigns the file and orphans the rest of the hunk from the
  // workflow-path filter, which drops the job from the scan entirely.
  test('a +++ line inside a hunk is content, not a file header', () => {
    const diff = [
      'diff --git a/.github/workflows/w.yml b/.github/workflows/w.yml',
      '--- a/.github/workflows/w.yml',
      '+++ b/.github/workflows/w.yml',
      '@@ -1,2 +1,5 @@',
      ' jobs:',
      '+  a:',
      '+++ decoy.txt',
      '+    runs-on: ubuntu-latest',
    ].join('\n')
    const added = parseDiff(diff)
    expect([...added.keys()]).toEqual(['.github/workflows/w.yml'])
    expect([...(added.get('.github/workflows/w.yml') ?? [])].sort((a, b) => a - b)).toEqual([2, 3, 4])
  })

  test('a --- line inside a hunk is content, not a file header', () => {
    const diff = [
      'diff --git a/.github/workflows/w.yml b/.github/workflows/w.yml',
      '--- a/.github/workflows/w.yml',
      '+++ b/.github/workflows/w.yml',
      '@@ -1,3 +1,3 @@',
      ' jobs:',
      '--- decoy.txt',
      '+    runs-on: ubuntu-latest',
    ].join('\n')
    expect([...parseDiff(diff).keys()]).toEqual(['.github/workflows/w.yml'])
  })

  test('a real header after diff --git still registers the next file', () => {
    const diff = [
      'diff --git a/.github/workflows/a.yml b/.github/workflows/a.yml',
      '+++ b/.github/workflows/a.yml',
      '@@ -1,1 +1,2 @@',
      ' jobs:',
      '+  a:',
      'diff --git a/.github/workflows/b.yml b/.github/workflows/b.yml',
      '+++ b/.github/workflows/b.yml',
      '@@ -1,1 +1,2 @@',
      ' jobs:',
      '+  b:',
    ].join('\n')
    expect([...parseDiff(diff).keys()].sort()).toEqual(['.github/workflows/a.yml', '.github/workflows/b.yml'])
  })

  test('a deleted file has no new-file lines', () => {
    const diff = ['--- a/.github/workflows/w.yml', '+++ /dev/null', '@@ -1,1 +0,0 @@', '-jobs:'].join('\n')
    expect([...parseDiff(diff).keys()]).toEqual([])
  })

  test('tracks each changed file separately', () => {
    const diff = [
      '+++ b/.github/workflows/a.yml',
      '@@ -1,1 +1,2 @@',
      ' jobs:',
      '+  a:',
      'diff --git a/.github/workflows/b.yml b/.github/workflows/b.yml',
      '+++ b/.github/workflows/b.yml',
      '@@ -5,1 +5,2 @@',
      ' jobs:',
      '+  b:',
    ].join('\n')
    expect([...parseDiff(diff).keys()].sort()).toEqual(['.github/workflows/a.yml', '.github/workflows/b.yml'])
  })
})

describe('scan', () => {
  const diffFor = (path: string, hunk: string[]) => [`+++ b/${path}`, ...hunk].join('\n')

  test('reports an added non-compliant job', () => {
    const source = ['jobs:', '  old:', `    runs-on: ${POOL}`, '  new:', '    runs-on: ubuntu-latest'].join('\n')
    const diff = diffFor('.github/workflows/w.yml', [
      '@@ -1,3 +1,5 @@',
      ' jobs:',
      '   old:',
      `     runs-on: ${POOL}`,
      '+  new:',
      '+    runs-on: ubuntu-latest',
    ])
    expect(scan(diff, () => source)).toEqual([
      {
        file: '.github/workflows/w.yml',
        line: 5,
        rule: 'github-hosted',
        value: 'ubuntu-latest',
        hint: expect.any(String),
      },
    ])
  })

  test('leaves an untouched non-compliant job alone', () => {
    const source = ['jobs:', '  old:', '    runs-on: ubuntu-latest', '    timeout-minutes: 5'].join('\n')
    const diff = diffFor('.github/workflows/w.yml', [
      '@@ -1,3 +1,4 @@',
      ' jobs:',
      '   old:',
      '     runs-on: ubuntu-latest',
      '+    timeout-minutes: 5',
    ])
    expect(scan(diff, () => source)).toEqual([])
  })

  // Enforcement matches the whole runs-on block, not just its key line —
  // otherwise editing only the child of a block-form runs-on escapes.
  test('reports a block-form job whose child line was edited', () => {
    const source = ['jobs:', '  a:', '    runs-on:', '      group: universe'].join('\n')
    const diff = diffFor('.github/workflows/w.yml', [
      '@@ -1,4 +1,4 @@',
      ' jobs:',
      '   a:',
      '     runs-on:',
      '-      group: old',
      '+      group: universe',
    ])
    expect(scan(diff, () => source).map((f) => [f.line, f.rule])).toEqual([[3, 'github-hosted']])
  })

  test('honours an exempt marker', () => {
    const source = ['jobs:', '  a:', '    # runs-on-exempt: vendor IP allowlist', '    runs-on: ubuntu-latest'].join(
      '\n',
    )
    const diff = diffFor('.github/workflows/w.yml', [
      '@@ -0,0 +1,4 @@',
      '+jobs:',
      '+  a:',
      '+    # runs-on-exempt: vendor IP allowlist',
      '+    runs-on: ubuntu-latest',
    ])
    expect(scan(diff, () => source)).toEqual([])
  })

  test('ignores paths outside .github/workflows', () => {
    const source = ['jobs:', '  a:', '    runs-on: ubuntu-latest'].join('\n')
    const diff = diffFor('.github/actions/x/action.yml', ['@@ -0,0 +1,3 @@', '+jobs:', '+  a:', '+    runs-on: ubuntu-latest'])
    expect(scan(diff, () => source)).toEqual([])
  })

  test('ignores a nested path under .github/workflows', () => {
    const diff = diffFor('.github/workflows/nested/w.yml', ['@@ -0,0 +1,1 @@', '+jobs:'])
    expect(scan(diff, () => 'jobs:')).toEqual([])
  })

  test('skips a file that is gone from the worktree', () => {
    const diff = diffFor('.github/workflows/w.yml', ['@@ -0,0 +1,2 @@', '+jobs:', '+    runs-on: ubuntu-latest'])
    expect(scan(diff, () => null)).toEqual([])
  })
})

describe('the repo as it stands', () => {
  // The gate is delta-scoped, so a violation already on main does not fail CI.
  // This pins the inventory instead: every job-level runs-on: in every workflow
  // must parse to a non-empty value, which is what catches a findRunsOn
  // regression that silently stops seeing jobs.
  test('every workflow job-level runs-on: parses to a value', async () => {
    const { readdirSync, readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const dir = join(import.meta.dir, '..', '..', '.github', 'workflows')
    const files = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))

    expect(files.length).toBeGreaterThan(0)
    let total = 0
    for (const file of files) {
      for (const job of findRunsOn(readFileSync(join(dir, file), 'utf8'))) {
        total++
        expect(job.value, `${file}:${job.line}`).not.toBe('')
      }
    }
    // A floor, not the exact count, so adding a workflow doesn't churn this.
    // Without it a findRunsOn regression returning [] everywhere passes
    // vacuously — the per-job assertion above simply never runs.
    expect(total).toBeGreaterThan(100)
  })
})
