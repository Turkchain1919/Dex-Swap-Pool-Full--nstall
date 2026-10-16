/**
 * Contract between i18n.config.ts and the app's own locale sources.
 *
 * The config derives its locale list from language/constants.ts, so list
 * drift is impossible — what these tests guard instead is (1) the on-disk
 * translation files staying in lockstep with the derived list, and (2) the
 * import-purity invariant: the external `@uniswap/i18n-cli` loads the config
 * with a plain bun import() and WITHOUT this repo's node_modules, so every
 * import reachable from the config must be relative. A bare specifier
 * sneaking into constants.ts would break the translation workflow at
 * runtime; here it fails in CI.
 *
 * Run with `bun test scripts/i18n-config.test.ts`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'bun:test'
import i18nConfig from '../i18n.config'

const source = i18nConfig.sources[0]!
const translationsDir = source.target.slice(0, source.target.lastIndexOf('/'))

describe('i18n.config.ts locales', () => {
  const configured = i18nConfig.locales

  it('are unique', () => {
    expect(new Set(configured).size).toBe(configured.length)
  })

  it('reach only relative, dependency-free imports (the CLI loads the config without node_modules)', () => {
    // Walk the config's static import graph transitively: every specifier
    // reachable from i18n.config.ts must be relative, because the CLI
    // imports the config with plain bun import() and no node_modules — a
    // bare specifier anywhere in the graph breaks the translation workflow.
    const visited = new Set<string>()
    const queue = [resolve('i18n.config.ts')]
    while (queue.length > 0) {
      const file = queue.pop()!
      if (visited.has(file)) {
        continue
      }
      visited.add(file)
      const specifiers = [...readFileSync(file, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]!)
      for (const specifier of specifiers) {
        expect(specifier.startsWith('.'), `${relative('.', file)} imports bare specifier '${specifier}'`).toBe(true)
        const base = resolve(dirname(file), specifier)
        const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]
        const target = candidates.find((c) => existsSync(c) && statSync(c).isFile())
        expect(target, `${relative('.', file)} imports '${specifier}' which resolves to no file`).toBeDefined()
        queue.push(target!)
      }
    }
    // Today's graph is exactly the config + constants.ts; growth is fine as
    // long as every reached file stays pure — this assertion is just a
    // heads-up that the graph changed shape.
    expect([...visited].map((f) => relative('.', f)).sort()).toEqual([
      'i18n.config.ts',
      'packages/uniswap/src/features/language/constants.ts',
    ])
  })

  it('each have a translation file at the configured target path', () => {
    const files = new Set(readdirSync(translationsDir))
    for (const locale of configured) {
      expect(files).toContain(`${locale}.json`)
    }
  })

  it('cover every translation file on disk', () => {
    const onDisk = readdirSync(translationsDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
    for (const locale of onDisk) {
      expect(configured).toContain(locale)
    }
  })

  it('point at an existing source file', async () => {
    expect(await Bun.file(source.source).exists()).toBe(true)
  })
})
