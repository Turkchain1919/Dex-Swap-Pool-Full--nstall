/**
 * Gate the on-disk translation-memory shards before the pipeline trusts or
 * commits them. TypeScript port of the workflow's find/jq gates; one
 * implementation now serves both call sites, which the bash version kept as
 * hand-synchronized twins:
 *
 * - `--mode require` (restore step, PRE-spend): any problem exits 1 with an
 *   `::error` — refusing costs nothing there.
 * - `--mode report` (commit step, POST-spend): any problem exits 2 with a
 *   `::warning` — a bad shard must cost the memory update, never the paid
 *   locale batch; the shards regenerate next run. Exit 0 means shards exist
 *   and are stageable; exit 3 means nothing exists (also not stageable, but
 *   not warning-worthy).
 *
 * The checks are layered like the locale-file guard: PARENTS first (`.i18n`
 * or the memory dir replaced by a symlink makes every leaf test and `cp`
 * resolve through a path the translate agent chose, while [ -f ]-style leaf
 * checks still read true), then entries (regular, `.json`, non-executable),
 * then per-shard content — byte cap and v1-shard shape with the declared
 * locale matching the filename. Shape and size are the enforceable part; a
 * schema-valid lie is the accepted residual, reviewed via the batch PR.
 */
import { lstatSync, readdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { annotate, requireEnv, requireIntEnv } from './lib.ts'

export interface ShardProblem {
  path: string
  problem: string
}

interface FsLike {
  lstat(path: string): { isDirectory(): boolean; isFile(): boolean; isSymbolicLink(): boolean; size: number; mode: number } | undefined
  readdir(path: string): string[]
  readFile(path: string): string
}

export const realFs: FsLike = {
  lstat(path) {
    try {
      return lstatSync(path)
    } catch {
      return undefined
    }
  },
  readdir(path) {
    return readdirSync(path)
  },
  readFile(path) {
    return readFileSync(path, 'utf-8')
  },
}

/** Empty result array = valid (or absent — distinguished by `exists`). */
export function verifyShards(input: {
  memoryDir: string
  maxBytes: number
  fs?: FsLike
}): { exists: boolean; problems: ShardProblem[] } {
  const fs = input.fs ?? realFs
  const dir = input.memoryDir

  const dirStat = fs.lstat(dir)
  if (dirStat === undefined) return { exists: false, problems: [] }

  const problems: ShardProblem[] = []
  // Parents before leaves — a symlinked ancestor redirects every later check.
  const parent = dirname(dir)
  const parentStat = fs.lstat(parent)
  if (parentStat === undefined || parentStat.isSymbolicLink() || !parentStat.isDirectory()) {
    return { exists: true, problems: [{ path: parent, problem: 'not a real directory' }] }
  }
  if (dirStat.isSymbolicLink() || !dirStat.isDirectory()) {
    return { exists: true, problems: [{ path: dir, problem: 'not a real directory' }] }
  }

  const names = fs.readdir(dir)
  if (names.length === 0) return { exists: false, problems: [] }

  for (const name of names) {
    const path = `${dir}/${name}`
    const stat = fs.lstat(path)
    if (stat === undefined) {
      // Raced away between readdir and lstat — still a reason not to trust
      // the directory, reported as a verdict instead of a TypeError.
      problems.push({ path, problem: 'vanished during validation' })
      continue
    }
    if (stat.isSymbolicLink() || !stat.isFile() || !name.endsWith('.json')) {
      problems.push({ path, problem: 'not a plain .json file' })
      continue
    }
    if ((stat.mode & 0o100) !== 0) {
      problems.push({ path, problem: 'executable bit set' })
      continue
    }
    if (stat.size > input.maxBytes) {
      problems.push({ path, problem: `${stat.size} bytes exceeds the ${input.maxBytes}-byte cap` })
      continue
    }
    const stem = name.slice(0, -'.json'.length)
    let parsed: unknown
    try {
      parsed = JSON.parse(fs.readFile(path))
    } catch {
      problems.push({ path, problem: 'not valid JSON' })
      continue
    }
    const record = parsed as Record<string, unknown> | null
    if (
      typeof record !== 'object' ||
      record === null ||
      Array.isArray(record) ||
      record.version !== 1 ||
      record.locale !== stem ||
      !Array.isArray(record.entries)
    ) {
      problems.push({ path, problem: `not a v1 memory shard for locale ${stem}` })
    }
  }
  return { exists: true, problems }
}

export function main(): void {
  const mode = process.argv.includes('--mode') ? process.argv[process.argv.indexOf('--mode') + 1] : undefined
  if (mode !== 'require' && mode !== 'report') {
    console.error('usage: verify-memory-shards.ts --mode <require|report>')
    process.exit(64)
  }
  const memoryDir = requireEnv('I18N_MEMORY_DIR')
  const maxBytes = requireIntEnv('I18N_MEMORY_MAX_BYTES')

  const { exists, problems } = verifyShards({ memoryDir, maxBytes })
  if (!exists) {
    // Nothing on disk. In require mode (restore step) that is a fine state —
    // the bash treated zero shards as success — and must not abort the run
    // silently under set -e; in report mode exit 3 tells the gate step there
    // is nothing to stage.
    if (mode === 'require') {
      console.log(`No memory shards at ${memoryDir} — nothing to validate.`)
      return
    }
    process.exit(3)
  }
  if (problems.length === 0) {
    console.log(`Verified: ${memoryDir} holds valid v1 memory shards.`)
    return
  }
  const detail = problems.map((p) => `${p.path}: ${p.problem}`).join('; ')
  if (mode === 'require') {
    annotate('error', `${memoryDir} failed validation — refusing to use it: ${detail}`)
    process.exit(1)
  }
  annotate('warning', `${memoryDir} failed validation — committing this batch WITHOUT its memory update; the shards regenerate next run: ${detail}`)
  process.exit(2)
}

if (import.meta.main) main()
