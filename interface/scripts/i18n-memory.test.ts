/**
 * Validation gate for committed translation-memory shards
 * (`.i18n/memory/<locale>.json`).
 *
 * The shards are machine-written trusted state: the pipeline's classifier
 * reads them back on every run (per-unit status, human-edit flags, staleness
 * hashes). Nothing stops a developer who ran i18n-cli locally from committing
 * their copies with `git add -A` in an unrelated PR — so, like the glossary
 * gate in i18n-glossary.test.ts, this fails such a PR unless every shard has
 * the shape the CLI parses (internal-tools memory-store.ts, v1 shard) and a
 * sane size. A schema-valid wrong memory still passes; the batch PR review is
 * the content gate.
 *
 * The size cap is parsed from the workflow's I18N_MEMORY_MAX_BYTES env so the
 * two gates cannot drift. The directory does not exist until the CLI's write
 * path ships (internal-tools#183) and a pipeline run commits — absent is
 * valid. Run with `bun test scripts/i18n-memory.test.ts`.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'

const MEMORY_DIR = '.i18n/memory'
const WORKFLOW = '.github/workflows/i18n_generate_translations.yml'

function workflowByteCap(): number {
  const match = readFileSync(WORKFLOW, 'utf-8').match(/^\s*I18N_MEMORY_MAX_BYTES:\s*'(\d+)'/m)
  if (!match) throw new Error(`${WORKFLOW} no longer defines I18N_MEMORY_MAX_BYTES — update this gate with it`)
  return Number(match[1])
}

describe('committed translation-memory shards', () => {
  it('the workflow declares the byte cap this gate mirrors', () => {
    expect(workflowByteCap()).toBeGreaterThan(0)
  })

  if (!existsSync(MEMORY_DIR)) {
    it('directory is absent — valid until the CLI write path ships and a run commits', () => {
      expect(existsSync(MEMORY_DIR)).toBe(false)
    })
    return
  }

  const shards = readdirSync(MEMORY_DIR)

  it('contains only per-locale .json shards', () => {
    expect(shards.filter((name) => !name.endsWith('.json'))).toEqual([])
  })

  for (const name of shards.filter((n) => n.endsWith('.json'))) {
    const path = join(MEMORY_DIR, name)
    const stem = name.slice(0, -'.json'.length)

    it(`${path} stays under the workflow's byte cap`, () => {
      expect(statSync(path).size).toBeLessThanOrEqual(workflowByteCap())
    })

    it(`${path} parses as a v1 shard for its own locale`, () => {
      const parsed: unknown = JSON.parse(readFileSync(path, 'utf-8'))
      expect(typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)).toBe(true)
      const record = parsed as Record<string, unknown>
      expect(record.version).toBe(1)
      expect(record.locale).toBe(stem)
      expect(Array.isArray(record.entries)).toBe(true)
      for (const [idx, entry] of (record.entries as unknown[]).entries()) {
        expect(
          Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string',
          `entries[${idx}] must be a [key, value] pair`,
        ).toBe(true)
      }
    })
  }
})
