/**
 * Run with `bun test ./scripts/compute-affected.test.ts`.
 *
 * compute-affected.sh decides what every CI job does, and its failure mode is a
 * green run that validated nothing — so the interesting assertions here are the
 * fail-open paths and the PATH_FILTERS rows, neither of which is visible in a
 * passing CI run.
 *
 * `git` and `bun` are stubbed on PATH so a case is just "this diff produced
 * these outputs". Real `grep` and `jq` are used, since the script's behaviour
 * depends on their semantics.
 */
import { describe, expect, test } from 'bun:test'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REPO_ROOT = join(import.meta.dir, '..')
const SCRIPT = join(REPO_ROOT, 'scripts', 'compute-affected.sh')

interface RunOptions {
  /** Paths the stubbed `git diff` reports. */
  changed: string[]
  /** Projects the stubbed `nx show projects --affected` reports. */
  projects?: string[]
  /** false makes `git rev-parse --verify HEAD^2` fail — not a PR merge commit. */
  mergeCommit?: boolean
  /** true makes `git diff` exit non-zero. */
  diffFails?: boolean
  /** true makes `nx show projects` exit non-zero. */
  nxFails?: boolean
  mode?: string
}

type Outputs = Record<string, string>

function run({
  changed,
  projects = [],
  mergeCommit = true,
  diffFails = false,
  nxFails = false,
  mode = 'affected',
}: RunOptions): { outputs: Outputs; stdout: string; exitCode: number } {
  const dir = mkdtempSync(join(tmpdir(), 'compute-affected-'))
  try {
    const fakeBin = join(dir, 'bin')
    mkdirSync(fakeBin, { recursive: true })
    const outputFile = join(dir, 'github-output')
    writeFileSync(outputFile, '')
    writeFileSync(join(dir, 'changed.txt'), changed.join('\n'))
    writeFileSync(join(dir, 'projects.txt'), projects.join('\n'))

    const git = `#!/bin/bash
# Drop a leading \`-c key=value\` the way real git does.
[ "$1" = "-c" ] && shift 2
case "$1 $2" in
  "rev-parse --verify") exit ${mergeCommit ? 0 : 1} ;;
  "rev-parse HEAD^1") echo "basesha" ;;
  "diff --name-only") ${diffFails ? 'exit 1' : `cat "${dir}/changed.txt"`} ;;
  *) echo "unexpected git: $*" >&2; exit 99 ;;
esac
`
    const bun = `#!/bin/bash
if [ "$1 $2 $3" = "nx show projects" ]; then
  ${nxFails ? 'exit 1' : `cat "${dir}/projects.txt"`}
  exit 0
fi
echo "unexpected bun: $*" >&2; exit 99
`
    writeFileSync(join(fakeBin, 'git'), git, { mode: 0o755 })
    writeFileSync(join(fakeBin, 'bun'), bun, { mode: 0o755 })
    chmodSync(join(fakeBin, 'git'), 0o755)
    chmodSync(join(fakeBin, 'bun'), 0o755)

    const proc = Bun.spawnSync({
      cmd: ['bash', SCRIPT],
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        PATH: `${fakeBin}:${process.env.PATH}`,
        GITHUB_OUTPUT: outputFile,
        MODE: mode,
      },
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const outputs: Outputs = {}
    for (const line of readFileSync(outputFile, 'utf8').split('\n')) {
      const index = line.indexOf('=')
      if (index > 0) {
        outputs[line.slice(0, index)] = line.slice(index + 1)
      }
    }
    return { outputs, stdout: proc.stdout.toString() + proc.stderr.toString(), exitCode: proc.exitCode ?? 0 }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const ROWS = ['SCRIPTS', 'I18N', 'CONFIG', 'SANDBOX', 'WORKBENCH', 'RH_CCA'] as const

/** Every row that came back 'true'. */
const trueRows = (outputs: Outputs): string[] => ROWS.filter((row) => outputs[row] === 'true')

describe('PATH_FILTERS rows', () => {
  test.each([
    ['scripts/compute-affected.sh', ['SCRIPTS']],
    ['scripts/security-gate-check/security-gate-check.sh', ['SCRIPTS']],
    // Root files the scripts/ suites assert against — invisible to nx, and the
    // reason SCRIPTS is not a plain `^scripts/` filter.
    ['apps/web/package.json', ['SCRIPTS']],
    ['apps/mobile/eas.json', ['SCRIPTS']],
    ['bun.lock', ['SCRIPTS', 'WORKBENCH', 'RH_CCA']],
    // Files outside scripts/ that suites under it read. CONFIG and RH_CCA also
    // match import-boundaries.json, but they gate other jobs.
    ['config/oxlint-plugins/import-boundaries.json', ['SCRIPTS', 'CONFIG', 'RH_CCA']],
    // I18N, not SCRIPTS: i18n-glossary.test.ts runs in the 41ms i18n job, so a
    // glossary edit must not drag the 172s script-tests job along.
    ['.i18n/glossary/core/rate.md', ['I18N']],
    // Same reasoning for the committed memory shards: i18n-memory.test.ts is
    // the only gate between an accidental shard commit and the next pipeline
    // run trusting it, so the path must select the I18N job.
    ['.i18n/memory/es-ES.json', ['I18N']],
    ['i18n.config.ts', ['I18N']],
    ['packages/uniswap/src/i18n/locales/translations/fr-FR.json', ['I18N', 'RH_CCA']],
    ['packages/uniswap/src/features/language/constants.ts', ['I18N', 'RH_CCA']],
    // A packages/uniswap file outside that closure must NOT open I18N — that
    // breadth is exactly what the nx-project clause cost us.
    ['packages/uniswap/src/features/swap/hooks.ts', ['RH_CCA']],
    ['config/oxlint-plugins/universe-custom.js', ['CONFIG', 'RH_CCA']],
    ['labs/sandbox/app/explore/page.tsx', ['SANDBOX']],
    ['labs/workbench/scripts/registry-guard.ts', ['WORKBENCH']],
    ['labs/rh-cca/app/root.tsx', ['RH_CCA']],
    // A package in both labs programs' tsconfig closures. This is what a plain
    // directory filter would have missed: a mycelium change can break
    // workbench's typecheck without touching labs/workbench at all.
    ['packages/mycelium/src/index.ts', ['WORKBENCH', 'RH_CCA']],
    ['packages/uniswap/src/index.ts', ['RH_CCA']],
    // Owned by an nx project and in no closure — nothing here should fire.
    ['apps/extension/src/app.tsx', []],
  ])('%s opens exactly %p', (path, expected) => {
    const { outputs } = run({ changed: [path] })
    expect(trueRows(outputs)).toEqual(expected)
    expect(outputs.RUN_ALL).toBe('false')
  })

  test('every row is emitted explicitly, so a consumer never reads an empty string', () => {
    const { outputs } = run({ changed: ['apps/extension/src/app.tsx'] })
    for (const row of ROWS) {
      expect(outputs[row]).toBeOneOf(['true', 'false'])
    }
  })

  test('the shared .bun-version pin opens SCRIPTS and both labs closures', () => {
    // The security-gate suite parses YAML with Bun.YAML, so the Bun version is
    // one of its inputs; the labs rows list it because their toolchain pins to it.
    const { outputs } = run({ changed: ['.bun-version'] })
    expect(trueRows(outputs)).toEqual(['SCRIPTS', 'WORKBENCH', 'RH_CCA'])
  })

  test('a workbench/rh-cca workflow edit exits into run-all, never into its own row', () => {
    // Why those two rows carry no entry for their own workflow file: the change
    // is not deploy-only, so it never reaches the loop.
    for (const path of ['.github/workflows/workbench_typecheck.yml', '.github/workflows/rh_cca_checks.yml']) {
      const { outputs } = run({ changed: [path] })
      expect(outputs.RUN_ALL).toBe('true')
      expect(outputs.WORKBENCH).toBeUndefined()
      expect(outputs.RH_CCA).toBeUndefined()
    }
  })
})

describe('run-all short-circuits leave the rows unset', () => {
  // Consumers must check run-all FIRST. These cases prove why: the loop is
  // never reached, so every row is absent rather than false.
  test('a .github/** change that can alter CI behaviour', () => {
    const { outputs, stdout } = run({ changed: ['.github/workflows/ci.yml'] })
    expect(outputs.RUN_ALL).toBe('true')
    expect(outputs.PROJECTS).toBe('[]')
    for (const row of ROWS) {
      expect(outputs[row]).toBeUndefined()
    }
    expect(stdout).toContain('.github/** changes detected')
  })

  test('an indeterminate merge base fails open', () => {
    const { outputs } = run({ changed: ['scripts/foo.ts'], mergeCommit: false })
    expect(outputs.RUN_ALL).toBe('true')
    expect(outputs.SCRIPTS).toBeUndefined()
  })

  test('an unreadable diff fails open', () => {
    const { outputs } = run({ changed: [], diffFails: true })
    expect(outputs.RUN_ALL).toBe('true')
    expect(outputs.SCRIPTS).toBeUndefined()
  })

  test('MODE other than affected fails open', () => {
    const { outputs } = run({ changed: ['scripts/foo.ts'], mode: 'run-all' })
    expect(outputs.RUN_ALL).toBe('true')
    expect(outputs.SCRIPTS).toBeUndefined()
  })

  test('a failed nx computation fails open, but after the rows are emitted', () => {
    // The rows come from the diff, not from nx, so a broken project graph must
    // not take them down with it — and RUN_ALL=true makes them moot anyway.
    const { outputs } = run({ changed: ['scripts/foo.ts'], nxFails: true })
    expect(outputs.RUN_ALL).toBe('true')
    expect(outputs.SCRIPTS).toBe('true')
  })
})

describe('deploy-only .github/** changes', () => {
  // The case that makes a `.github/` filter row unnecessary: a deploy-workflow
  // edit does NOT force run-all, and no suite reads those files, so every row
  // stays false and the script-tests jobs correctly skip.
  test('do not force run-all, and open no row', () => {
    const { outputs, stdout } = run({ changed: ['.github/workflows/web_production_deploy.yml'] })
    expect(outputs.RUN_ALL).toBe('false')
    expect(trueRows(outputs)).toEqual([])
    expect(stdout).toContain('deploy-only .github/** changes')
  })

  test('mixed with a CI-behaviour change, run-all still wins', () => {
    const { outputs } = run({
      changed: ['.github/workflows/web_production_deploy.yml', '.github/workflows/monorepo_unit_tests.yml'],
    })
    expect(outputs.RUN_ALL).toBe('true')
  })
})

describe('nx projects passthrough', () => {
  test('the affected list is emitted as a compact JSON array', () => {
    const { outputs } = run({
      changed: ['apps/extension/src/app.tsx'],
      projects: ['@uniswap/extension', 'ui'],
    })
    expect(outputs.PROJECTS).toBe('["@uniswap/extension","ui"]')
    expect(outputs.RUN_ALL).toBe('false')
  })

  test('an empty affected list is still valid JSON for fromJSON', () => {
    const { outputs } = run({ changed: ['README.md'], projects: [] })
    expect(outputs.PROJECTS).toBe('[]')
  })
})
