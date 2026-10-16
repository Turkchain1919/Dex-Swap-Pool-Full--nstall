/**
 * Run with `bun test config/oxlint-plugins/import-boundaries.test.ts`
 *
 * Tests for the `swap-ui-views` boundary (universe-custom/import-boundary,
 * config in import-boundaries.json). There is no ESLint RuleTester in this
 * repo, so these drive the real oxlint binary over generated fixtures whose
 * physical paths carry the boundary's markers — the exact wiring CI uses,
 * including the AND-marker matching ("swap tree" AND "/views/").
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const REPO_ROOT = join(import.meta.dir, '../..')
const PLUGIN_PATH = join(import.meta.dir, 'universe-custom.js')
const OXLINT_BIN = join(REPO_ROOT, 'node_modules/.bin/oxlint')

const SWAP_VIEWS_DIR = 'packages/uniswap/src/features/transactions/swap/review/views'
const SWAP_ADAPTER_DIR = 'packages/uniswap/src/features/transactions/swap/review'

interface Diagnostic {
  message: string
}

let fixtureRoot: string

beforeAll(() => {
  fixtureRoot = mkdtempSync(join(tmpdir(), 'import-boundaries-'))
})

afterAll(() => {
  rmSync(fixtureRoot, { recursive: true, force: true })
})

function lintFixture({
  source,
  fileDir,
  fileName = 'Fixture.tsx',
}: {
  source: string
  /** Repo-relative directory the fixture pretends to live in (becomes part of the physical path). */
  fileDir: string
  fileName?: string
}): Diagnostic[] {
  const dir = mkdtempSync(join(fixtureRoot, 'case-'))
  const filePath = join(dir, fileDir, fileName)
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, source)

  const configPath = join(dir, '.oxlintrc.json')
  writeFileSync(
    configPath,
    JSON.stringify({
      plugins: [],
      categories: { correctness: 'off' },
      jsPlugins: [PLUGIN_PATH],
      rules: { 'universe-custom/import-boundary': 'error' },
    }),
  )

  const result = Bun.spawnSync([OXLINT_BIN, '-c', configPath, '--format', 'json', filePath], {
    cwd: dir,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  // 0 = clean, 1 = diagnostics found; anything else means oxlint itself failed
  // (e.g. plugin load error), which would let negative cases pass vacuously.
  if (result.exitCode !== 0 && result.exitCode !== 1) {
    throw new Error(`oxlint exited with ${result.exitCode} (stderr: ${result.stderr.toString()})`)
  }
  let parsed: { diagnostics?: Diagnostic[] }
  try {
    parsed = JSON.parse(result.stdout.toString()) as { diagnostics?: Diagnostic[] }
  } catch (error) {
    throw new Error(`oxlint did not emit JSON (stderr: ${result.stderr.toString()})`, { cause: error })
  }
  return (parsed.diagnostics ?? []).filter((d) => /Swap views/.test(d.message))
}

describe('swap-ui-views boundary', () => {
  test('MUST FIRE: a view importing analytics', () => {
    const diagnostics = lintFixture({
      fileDir: SWAP_VIEWS_DIR,
      source: `
import { Trace } from 'uniswap/src/features/telemetry/Trace'

export function SwapDetailsView(): JSX.Element {
  return <Trace logPress />
}
`,
    })
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]?.message).toContain('POLICIES.md')
  })

  test('MUST FIRE: a view reading a swap store', () => {
    const diagnostics = lintFixture({
      fileDir: SWAP_VIEWS_DIR,
      source: `
import { useSwapFormStore } from 'uniswap/src/features/transactions/swap/stores/swapFormStore/useSwapFormStore'

export function AmountView(): string {
  return useSwapFormStore((s) => s.exactAmountToken)
}
`,
    })
    expect(diagnostics).toHaveLength(1)
  })

  test('MUST FIRE: a view importing a modal shell, a flag hook, or react-query', () => {
    for (const importLine of [
      `import { Modal } from 'uniswap/src/components/modals/Modal'`,
      `import { useFeatureFlag } from '@universe/gating'`,
      `import { useQuery } from '@tanstack/react-query'`,
      `import { useDispatch } from 'react-redux'`,
    ]) {
      const diagnostics = lintFixture({
        fileDir: SWAP_VIEWS_DIR,
        source: `${importLine}\nexport const x = 1\n`,
      })
      expect(`${importLine}: ${diagnostics.length}`).toBe(`${importLine}: 1`)
    }
  })

  test('MUST FIRE: a dynamic import of a denied module from a view', () => {
    const diagnostics = lintFixture({
      fileDir: SWAP_VIEWS_DIR,
      source: `
export async function load(): Promise<unknown> {
  return import('uniswap/src/features/telemetry/send')
}
`,
    })
    expect(diagnostics).toHaveLength(1)
  })

  test('must NOT fire: presentational imports and type-only uniswap imports are legal in views', () => {
    const diagnostics = lintFixture({
      fileDir: SWAP_VIEWS_DIR,
      source: `
import { useState } from 'react'
import type { DerivedSwapInfo } from 'uniswap/src/features/transactions/swap/types/derivedSwapInfo'

export function SwapDetailsView({ info }: { info: DerivedSwapInfo }): number {
  const [n] = useState(0)
  return n
}
`,
    })
    expect(diagnostics).toHaveLength(0)
  })

  test('must NOT fire: adapters outside views/ keep their store reads', () => {
    const diagnostics = lintFixture({
      fileDir: SWAP_ADAPTER_DIR,
      source: `
import { useSwapFormStore } from 'uniswap/src/features/transactions/swap/stores/swapFormStore/useSwapFormStore'

export function useAmount(): string {
  return useSwapFormStore((s) => s.exactAmountToken)
}
`,
    })
    expect(diagnostics).toHaveLength(0)
  })

  test('must NOT fire: a views/ directory outside the swap tree (AND-marker semantics)', () => {
    const diagnostics = lintFixture({
      fileDir: 'packages/uniswap/src/features/portfolio/views',
      source: `
import { Trace } from 'uniswap/src/features/telemetry/Trace'

export function PortfolioView(): JSX.Element {
  return <Trace logPress />
}
`,
    })
    expect(diagnostics).toHaveLength(0)
  })
})
