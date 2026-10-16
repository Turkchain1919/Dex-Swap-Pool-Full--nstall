/**
 * Run with `bun test scripts/swap-ui/ledger.test.ts`
 *
 * Drift pins for the swap-ui movability ledger. Deliberately imports nothing
 * from node_modules (bun builtins only) so the CI job can run it without an
 * install, same constraint as tamagui-census.test.ts.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  BLOCKER_CLASSES,
  BLOCKER_DEFS,
  classify,
  HEURISTIC_VERSION,
  parseImports,
  renderSummary,
  scan,
  SCHEMA_VERSION,
} from './ledger'

const REPO_ROOT = join(import.meta.dir, '../..')

function classOf(source: string, opts: { names?: string[]; typeOnly?: boolean } = {}): string | undefined {
  return classify({ source, names: opts.names ?? [], typeOnly: opts.typeOnly ?? false })?.cls
}

describe('parseImports', () => {
  test('parses single-line, multi-line, and type-only imports', () => {
    const imports = parseImports(`
import { Flex } from 'ui/src'
import type {
  DerivedSwapInfo,
  Warning,
} from 'uniswap/src/features/transactions/swap/types/derivedSwapInfo'
import { useSwapFormStore } from 'uniswap/src/features/transactions/swap/stores/swapFormStore'
`)
    expect(imports).toHaveLength(3)
    expect(imports[0]).toMatchObject({ source: 'ui/src', typeOnly: false })
    expect(imports[1]?.typeOnly).toBe(true)
    expect(imports[1]?.names).toEqual(['DerivedSwapInfo', 'Warning'])
    expect(imports[2]?.names).toEqual(['useSwapFormStore'])
  })
})

describe('classify', () => {
  test('maps each blocker class', () => {
    expect(classOf('ui/src')).toBe('ui-src')
    expect(classOf('ui/src/components/layout')).toBe('ui-src')
    expect(classOf('@universe/gating')).toBe('flags')
    expect(classOf('@universe/compliance')).toBe('flags')
    expect(classOf('@tanstack/react-query')).toBe('query')
    expect(classOf('uniswap/src/features/telemetry/Trace')).toBe('telemetry')
    expect(classOf('utilities/src/telemetry/analytics/analytics')).toBe('telemetry')
    expect(classOf('uniswap/src/components/modals/Modal')).toBe('modal-shell')
    expect(classOf('uniswap/src/features/transactions/swap/stores/swapFormStore')).toBe('store-read')
    expect(classOf('uniswap/src/features/transactions/swap/form/stores/swapFormScreenStore')).toBe('store-read')
    expect(classOf('uniswap/src/contexts/UniswapContext')).toBe('store-read')
    expect(classOf('react-redux')).toBe('store-read')
    expect(classOf('uniswap/src/features/transactions/swap/types/trade', { typeOnly: true })).toBe('types-pending')
    expect(classOf('uniswap/src/utils/currencyId')).toBe('uniswap-runtime')
  })

  test('store hook names blocker wins over type-only on uniswap sources', () => {
    expect(classOf('uniswap/src/features/transactions/hooks', { names: ['useSwapTxStore'] })).toBe('store-read')
  })

  test('presentational imports are not blockers', () => {
    expect(classOf('react')).toBeUndefined()
    expect(classOf('@universe/mycelium/flex')).toBeUndefined()
    expect(classOf('uniswap/i18n')).toBeUndefined()
  })
})

describe('scan', () => {
  const ledger = scan()

  test('scans the real swap tree with a complete class breakdown', () => {
    expect(ledger.schemaVersion).toBe(SCHEMA_VERSION)
    expect(ledger.heuristicVersion).toBe(HEURISTIC_VERSION)
    expect(ledger.total).toBeGreaterThan(50)
    expect(ledger.movable).toBeLessThanOrEqual(ledger.total)
    expect(Object.keys(ledger.byClass).sort()).toEqual([...BLOCKER_CLASSES].sort())
    expect(Object.keys(ledger.blockerClasses).sort()).toEqual([...BLOCKER_CLASSES].sort())
  })

  test('stubs are never counted movable and blocked files never are either', () => {
    for (const f of ledger.files) {
      if (f.movable) {
        expect(f.stub).toBe(false)
        expect(Object.keys(f.blockers)).toHaveLength(0)
      }
    }
  })

  test('summary renders every class with its count', () => {
    const summary = renderSummary(ledger)
    for (const cls of BLOCKER_CLASSES) {
      expect(summary).toContain(`| \`${cls}\` | ${ledger.byClass[cls]} |`)
    }
  })
})

describe('fence <-> ledger drift pin', () => {
  // The swap-ui-views oxlint boundary must stay a subset of what the ledger
  // counts as a blocker: if the fence denies an import the ledger calls clean,
  // the two disagree about the definition of a view and one of them is wrong.
  test('every import the swap-ui-views boundary denies is a ledger blocker', () => {
    const { boundaries } = JSON.parse(
      readFileSync(join(REPO_ROOT, 'config/oxlint-plugins/import-boundaries.json'), 'utf8'),
    ) as { boundaries: { id: string; importPrefixes: string[]; bareModuleSources: string[] }[] }
    const fence = boundaries.find((b) => b.id === 'swap-ui-views')
    expect(fence).toBeDefined()
    for (const source of [...(fence?.importPrefixes ?? []), ...(fence?.bareModuleSources ?? [])]) {
      const cls = classOf(source)
      expect(`${source} -> ${cls}`).not.toEndWith('undefined')
      // The fence only names classes that policy bans outright; the
      // drain-by-refactor classes (ui-src, uniswap-runtime, types-pending)
      // are ledger-tracked, not fenced.
      expect(['store-read', 'flags', 'query', 'telemetry', 'modal-shell']).toContain(cls)
    }
  })

  test('every blocker class has a definition', () => {
    for (const cls of BLOCKER_CLASSES) {
      expect(BLOCKER_DEFS[cls].short.length).toBeGreaterThan(0)
      expect(BLOCKER_DEFS[cls].definition.length).toBeGreaterThan(0)
      expect(BLOCKER_DEFS[cls].drains.length).toBeGreaterThan(0)
    }
  })
})
