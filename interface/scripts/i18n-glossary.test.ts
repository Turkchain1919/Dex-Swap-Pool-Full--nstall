/**
 * Validation gate for the committed translation glossary (`.i18n/glossary/`).
 *
 * The glossary feeds the translate pipeline directly and has no owning nx
 * project, so without this test a malformed YAML file or a bad entry merges
 * green and breaks the next scheduled translation run hours later — paging
 * on-call for what was a doc-shaped PR. This mirrors exactly the checks
 * `@uniswap/i18n-cli` applies at load time (`src/glossary/load.ts` in
 * Uniswap/internal-tools), so a file that passes here loads there:
 *   - each `.yml`/`.yaml` file is a YAML array at the top level
 *   - every entry is an object with a non-empty string `term`
 *   - `termType` / `status`, when present, are valid enum values
 *
 * It also rejects files the loader would silently IGNORE (a `.yml` at the
 * glossary root, or an unknown tier directory) — a misplaced file otherwise
 * looks committed but contributes nothing to any run.
 *
 * Parses with `Bun.YAML` so the test needs no node_modules, like the other
 * tests in this CI step. Run with `bun test scripts/i18n-glossary.test.ts`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'

const GLOSSARY_ROOT = '.i18n/glossary'

// Copied from internal-tools packages/i18n-cli/src/glossary/types.ts — the
// loader rejects anything else. If a CLI bump extends these enums, extend the
// copies; a stale copy fails closed (rejects a value the CLI would accept),
// never open.
const TERM_TYPES = ['rate', 'amount', 'activity', 'action', 'phrase', 'name'] as const
const GLOSSARY_STATUSES = ['draft', 'corpus-derived', 'native-ratified', 'legal-approved'] as const

// The three tier directories the CLI's loader reads. Anything else under the
// glossary root is dead weight the loader ignores.
const KNOWN_TIERS = ['core', 'domains', 'locales'] as const
const ALLOWED_ROOT_FILES = ['README.md'] as const

function isYamlFile(name: string): boolean {
  return name.endsWith('.yml') || name.endsWith('.yaml')
}

function tierDirs(): string[] {
  return readdirSync(GLOSSARY_ROOT).filter((name) => statSync(join(GLOSSARY_ROOT, name)).isDirectory())
}

function yamlFiles(): string[] {
  return tierDirs().flatMap((tier) =>
    readdirSync(join(GLOSSARY_ROOT, tier))
      .filter(isYamlFile)
      .map((name) => join(GLOSSARY_ROOT, tier, name)),
  )
}

describe('glossary directory layout', () => {
  it('contains only the tier directories the CLI loader reads', () => {
    const unknownDirs = tierDirs().filter((d) => !(KNOWN_TIERS as readonly string[]).includes(d))
    expect(unknownDirs).toEqual([])
  })

  it('has no loose files at the root the loader would ignore', () => {
    const looseFiles = readdirSync(GLOSSARY_ROOT).filter(
      (name) =>
        statSync(join(GLOSSARY_ROOT, name)).isFile() && !(ALLOWED_ROOT_FILES as readonly string[]).includes(name),
    )
    expect(looseFiles).toEqual([])
  })

  it('tier directories contain only YAML files', () => {
    const strays = tierDirs().flatMap((tier) =>
      readdirSync(join(GLOSSARY_ROOT, tier))
        .filter((name) => !isYamlFile(name))
        .map((name) => join(tier, name)),
    )
    expect(strays).toEqual([])
  })

  it('is not empty — an empty glossary would silently fall through to the CLI seed', () => {
    expect(yamlFiles().length).toBeGreaterThan(0)
  })
})

describe('glossary entries load the way the CLI loads them', () => {
  for (const file of yamlFiles()) {
    it(`${file} parses and every entry passes the loader's checks`, () => {
      const parsed: unknown = Bun.YAML.parse(readFileSync(file, 'utf-8'))
      expect(Array.isArray(parsed)).toBe(true)

      for (const [idx, entry] of (parsed as unknown[]).entries()) {
        const where = `${file} entry [${idx}]`
        expect(typeof entry === 'object' && entry !== null, `${where} must be an object`).toBe(true)
        const record = entry as Record<string, unknown>
        expect(
          typeof record.term === 'string' && record.term.trim() !== '',
          `${where} is missing a non-empty string "term"`,
        ).toBe(true)
        if (record.termType !== undefined) {
          expect(
            (TERM_TYPES as readonly string[]).includes(record.termType as string),
            `${where} ("${String(record.term)}") has invalid termType ${JSON.stringify(record.termType)}`,
          ).toBe(true)
        }
        if (record.status !== undefined) {
          expect(
            (GLOSSARY_STATUSES as readonly string[]).includes(record.status as string),
            `${where} ("${String(record.term)}") has invalid status ${JSON.stringify(record.status)}`,
          ).toBe(true)
        }
      }
    })
  }
})
