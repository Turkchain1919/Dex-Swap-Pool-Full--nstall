/** The shard gate — including the symlink cases bash could only get right by
 *  hand-audit. Uses real tmp dirs so lstat semantics are the real thing. */
import { chmodSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'bun:test'
import { realFs, verifyShards } from './verify-memory-shards.ts'

let tmp: string
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'i18n-shards-'))
})

const CAP = 1024
const shard = (locale: string): string => JSON.stringify({ version: 1, locale, entries: [] })

function setupValid(): string {
  const dir = join(tmp, '.i18n', 'memory')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'es-ES.json'), shard('es-ES'))
  return dir
}

describe('verifyShards', () => {
  it('valid shards pass; absent dir is exists=false', () => {
    const dir = setupValid()
    expect(verifyShards({ memoryDir: dir, maxBytes: CAP })).toEqual({ exists: true, problems: [] })
    expect(verifyShards({ memoryDir: join(tmp, 'nope'), maxBytes: CAP }).exists).toBe(false)
  })

  it('a symlinked PARENT (.i18n) is rejected even though every leaf test would pass', () => {
    const real = join(tmp, 'elsewhere')
    mkdirSync(join(real, 'memory'), { recursive: true })
    writeFileSync(join(real, 'memory', 'es-ES.json'), shard('es-ES'))
    symlinkSync(real, join(tmp, '.i18n'))
    const res = verifyShards({ memoryDir: join(tmp, '.i18n', 'memory'), maxBytes: CAP })
    expect(res.problems[0]?.problem).toBe('not a real directory')
  })

  it('a symlinked memory dir is rejected', () => {
    mkdirSync(join(tmp, '.i18n'), { recursive: true })
    mkdirSync(join(tmp, 'evil'))
    symlinkSync(join(tmp, 'evil'), join(tmp, '.i18n', 'memory'))
    const res = verifyShards({ memoryDir: join(tmp, '.i18n', 'memory'), maxBytes: CAP })
    expect(res.problems[0]?.problem).toBe('not a real directory')
  })

  it('a symlink leaf inside the dir is rejected', () => {
    const dir = setupValid()
    writeFileSync(join(tmp, 'target.json'), shard('fr-FR'))
    symlinkSync(join(tmp, 'target.json'), join(dir, 'fr-FR.json'))
    const res = verifyShards({ memoryDir: dir, maxBytes: CAP })
    expect(res.problems.map((p) => p.problem)).toContain('not a plain .json file')
  })

  it('an executable shard is rejected — the restore side would refuse mode 100755 forever', () => {
    const dir = setupValid()
    chmodSync(join(dir, 'es-ES.json'), 0o755)
    const res = verifyShards({ memoryDir: dir, maxBytes: CAP })
    expect(res.problems[0]?.problem).toBe('executable bit set')
  })

  it('oversized, non-JSON, wrong-locale, and wrong-version shards are each named', () => {
    const dir = setupValid()
    writeFileSync(join(dir, 'fr-FR.json'), 'x'.repeat(CAP + 1))
    writeFileSync(join(dir, 'ja-JP.json'), '{nope')
    writeFileSync(join(dir, 'ko-KR.json'), shard('zh-CN'))
    writeFileSync(join(dir, 'nl-NL.json'), JSON.stringify({ version: 2, locale: 'nl-NL', entries: [] }))
    const problems = verifyShards({ memoryDir: dir, maxBytes: CAP }).problems
    expect(problems.find((p) => p.path.endsWith('fr-FR.json'))?.problem).toContain('exceeds')
    expect(problems.find((p) => p.path.endsWith('ja-JP.json'))?.problem).toBe('not valid JSON')
    expect(problems.find((p) => p.path.endsWith('ko-KR.json'))?.problem).toContain('not a v1 memory shard')
    expect(problems.find((p) => p.path.endsWith('nl-NL.json'))?.problem).toContain('not a v1 memory shard')
  })

  it('a shard deleted between readdir and lstat is a verdict, not a TypeError', () => {
    const dir = setupValid()
    const fake = {
      ...realFs,
      readdir: () => ['es-ES.json', 'ghost.json'],
      lstat: (p: string) => (p.endsWith('ghost.json') ? undefined : realFs.lstat(p)),
    }
    const res = verifyShards({ memoryDir: dir, maxBytes: CAP, fs: fake })
    expect(res.problems.map((p) => p.problem)).toContain('vanished during validation')
  })

  it('an empty dir is exists=false — nothing to stage, nothing to warn about', () => {
    const dir = join(tmp, '.i18n', 'memory')
    mkdirSync(dir, { recursive: true })
    expect(verifyShards({ memoryDir: dir, maxBytes: CAP })).toEqual({ exists: false, problems: [] })
  })
})

// ---------------------------------------------------------------------------
// CLI exit codes — the contract the workflow glue keys on
// ---------------------------------------------------------------------------

describe('CLI exit codes', () => {
  const SCRIPT = new URL('./verify-memory-shards.ts', import.meta.url).pathname

  function run(args: string[], env: Record<string, string>): number {
    return Bun.spawnSync(['bun', SCRIPT, ...args], {
      cwd: tmp,
      env: { ...process.env, ...env },
      stdout: 'pipe',
      stderr: 'pipe',
    }).exitCode
  }
  const ENV = { I18N_MEMORY_DIR: '.i18n/memory', I18N_MEMORY_MAX_BYTES: '1024' }

  it('0 = valid (report), 1 = invalid (require), 2 = invalid (report), 3 = absent (report)', () => {
    setupValid()
    expect(run(['--mode', 'report'], ENV)).toBe(0)
    expect(run(['--mode', 'require'], ENV)).toBe(0)
    writeFileSync(join(tmp, '.i18n', 'memory', 'es-ES.json'), 'garbage')
    expect(run(['--mode', 'report'], ENV)).toBe(2)
    expect(run(['--mode', 'require'], ENV)).toBe(1)
  })

  it('absent shards: report says 3, require says 0 — the bash treated zero shards as success', () => {
    expect(run(['--mode', 'report'], ENV)).toBe(3)
    expect(run(['--mode', 'require'], ENV)).toBe(0)
  })

  it('64 = misuse: bad --mode, or the env contract broken (fail closed, not NaN-open)', () => {
    setupValid()
    expect(run(['--mode', 'sideways'], ENV)).toBe(64)
    expect(run(['--mode', 'require'], { I18N_MEMORY_DIR: '.i18n/memory', I18N_MEMORY_MAX_BYTES: '' })).toBe(64)
    expect(run(['--mode', 'require'], { I18N_MEMORY_MAX_BYTES: '1024', I18N_MEMORY_DIR: '' })).toBe(64)
  })
})
