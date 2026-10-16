/**
 * Run with `bun test config/oxlint-plugins/styled-factory-literal-classes.test.ts`
 *
 * Colocated tests for `universe-custom/styled-factory-literal-classes` (rule
 * module: styled-factory-literal-classes.js, registered by universe-custom.js
 * — the harness lints through that registration, i.e. the exact wiring CI
 * uses). There is no ESLint RuleTester in this repo, so these drive the real
 * oxlint binary over generated fixtures.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REPO_ROOT = join(import.meta.dir, '../..')
const PLUGIN_PATH = join(import.meta.dir, 'universe-custom.js')
const OXLINT_BIN = join(REPO_ROOT, 'node_modules/.bin/oxlint')

interface Diagnostic {
  message: string
}

let fixtureRoot: string

beforeAll(() => {
  fixtureRoot = mkdtempSync(join(tmpdir(), 'styled-factory-literal-classes-'))
})

afterAll(() => {
  rmSync(fixtureRoot, { recursive: true, force: true })
})

function lintFixture({
  source,
  parentDir,
  fileName = 'Fixture.tsx',
}: {
  source: string
  /** Where to place the fixture; defaults to a temp dir outside the repo. */
  parentDir?: string
  fileName?: string
}): Diagnostic[] {
  const dir = mkdtempSync(join(parentDir ?? fixtureRoot, 'case-'))
  const filePath = join(dir, fileName)
  writeFileSync(filePath, source)

  const configPath = join(dir, '.oxlintrc.json')
  writeFileSync(
    configPath,
    JSON.stringify({
      plugins: [],
      categories: { correctness: 'off' },
      jsPlugins: [PLUGIN_PATH],
      rules: { 'universe-custom/styled-factory-literal-classes': 'error' },
    }),
  )

  const result = Bun.spawnSync([OXLINT_BIN, '-c', configPath, '--format', 'json', filePath], {
    cwd: dir,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = result.stdout.toString()
  // 0 = clean, 1 = diagnostics found; anything else means oxlint itself failed
  // (e.g. plugin load error), which would let negative cases pass vacuously.
  if (result.exitCode !== 0 && result.exitCode !== 1) {
    throw new Error(`oxlint exited with ${result.exitCode} (stderr: ${result.stderr.toString()})`)
  }
  let parsed: { diagnostics?: Diagnostic[] }
  try {
    parsed = JSON.parse(stdout) as { diagnostics?: Diagnostic[] }
  } catch (error) {
    throw new Error(`oxlint did not emit JSON (stderr: ${result.stderr.toString()})`, { cause: error })
  }
  return (parsed.diagnostics ?? []).filter((d) => /styled\(\) class positions/.test(d.message))
}

const ALL_POSITIONS_FIXTURE = `
import { styled } from '@universe/mycelium/styled'

const BASE = 'flex flex-col'

export const Frame = styled('div', {
  base: \`\${BASE} rounded-12\`,
  variants: {
    tone: { loud: \`\${BASE} bg-surface3\`, quiet: 'bg-surface2' },
  },
  compoundVariants: [{ tone: 'loud', class: \`\${BASE} p-2\` }],
  hover: [{ class: \`\${BASE} bg-surface3-hovered\` }],
})
`

describe('styled-factory-literal-classes', () => {
  test('fires on template literals in every class position (base, variants branch, compound class, hover class)', () => {
    const diagnostics = lintFixture({ source: ALL_POSITIONS_FIXTURE })
    expect(diagnostics).toHaveLength(4)
  })

  test('fires on hole-free template literals too — the scanner reads source text, not types', () => {
    const source = `
import { styled } from '@universe/mycelium/styled'
export const Frame = styled('div', { base: \`rounded-12 bg-surface2\` })
`
    const diagnostics = lintFixture({ source })
    expect(diagnostics).toHaveLength(1)
  })

  test('tracks aliased imports (styled as factoryStyled) and deep relative sources', () => {
    const source = `
import { styled as factoryStyled } from '../../../../../mycelium/src/styled'
const BASE = 'flex'
export const Frame = factoryStyled('div', { base: \`\${BASE} p-1\` })
`
    const diagnostics = lintFixture({ source })
    expect(diagnostics).toHaveLength(1)
  })

  test('stays silent on plain string literals in every position', () => {
    const source = `
import { styled } from '@universe/mycelium/styled'
export const Frame = styled('div', {
  base: 'flex flex-col rounded-12',
  variants: { tone: { loud: 'bg-surface3', quiet: 'bg-surface2' } },
  compoundVariants: [{ tone: 'loud', class: 'p-2' }],
  hover: [{ class: 'bg-surface3-hovered' }],
})
`
    expect(lintFixture({ source })).toHaveLength(0)
  })

  test('ignores template literals outside class positions (inlineStyle etc.) and other styled() functions', () => {
    const source = `
import { styled } from 'ui/src'
import { styled as factory } from '@universe/mycelium/styled'
const B = 'x'
// A legacy ui/src styled() call — out of scope for this rule.
const Legacy = styled('div' as never, { name: \`\${B}-legacy\` } as never)
export const Frame = factory('div', {
  base: 'flex',
  inlineStyle: () => ({ transition: \`\${B}00ms\` }),
})
export const other = \`\${B} not-a-styled-call\`
`
    expect(lintFixture({ source })).toHaveLength(0)
  })

  test('a plain local function named styled from an unrelated module is not tracked', () => {
    const source = `
import { styled } from './theme/styledComponents'
const B = 'x'
export const Frame = styled('div', { base: \`\${B} p-1\` })
`
    expect(lintFixture({ source })).toHaveLength(0)
  })

  // The conversion recipe (styled-factory.md) and every fixture hoist the
  // class tables to same-module consts — the rule must inspect THAT shape,
  // not just inline tables at the call site.
  test('fires on a const-interpolated template inside a hoisted `as const` variants table', () => {
    const source = `
import { styled } from '@universe/mycelium/styled'
const BASE = 'flex'
const FRAME_VARIANTS = {
  tone: { loud: \`\${BASE} bg-surface3\`, quiet: 'bg-surface2' },
} as const
export const Frame = styled('div', { base: 'rounded-12', variants: FRAME_VARIANTS })
`
    const diagnostics = lintFixture({ source })
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]?.message).toMatch(/Template literals are banned/)
  })

  test('fires on templates in hoisted base / compoundVariants / hover consts too', () => {
    const source = `
import { styled } from '@universe/mycelium/styled'
const B = 'flex'
const BASE_CLASSES = \`\${B} rounded-12\`
const COMPOUNDS = [{ tone: 'loud', class: \`\${B} p-2\` }] as const
const HOVERS = [{ class: \`\${B} bg-surface3-hovered\` }] as const
export const Frame = styled('div', {
  base: BASE_CLASSES,
  variants: { tone: { loud: 'bg-surface3', quiet: 'bg-surface2' } },
  compoundVariants: COMPOUNDS,
  hover: HOVERS,
})
`
    const diagnostics = lintFixture({ source })
    expect(diagnostics).toHaveLength(3)
  })

  test('stays silent on the recommended hoisted shape when every class is a plain string literal', () => {
    const source = `
import { styled } from '@universe/mycelium/styled'
const FRAME_VARIANTS = {
  centered: { true: 'items-center justify-center', false: '' },
  variant: { outlined: 'border border-surface3', filled: 'bg-surface3' },
} as const
const COMPOUNDS = [{ variant: 'outlined', centered: true, class: 'p-2' }] as const
export const Frame = styled('div', {
  base: 'rounded-12 bg-transparent',
  variants: FRAME_VARIANTS,
  compoundVariants: COMPOUNDS,
  defaultVariants: { centered: false },
})
`
    expect(lintFixture({ source })).toHaveLength(0)
  })

  test('reports a table the rule cannot resolve statically (imported identifier) as unverifiable', () => {
    const source = `
import { styled } from '@universe/mycelium/styled'
import { SHARED_VARIANTS } from './shared-variants'
export const Frame = styled('div', { base: 'rounded-12', variants: SHARED_VARIANTS })
`
    const diagnostics = lintFixture({ source })
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]?.message).toMatch(/Unverifiable value in styled\(\) class positions/)
  })

  test('reports computed class values (call results) as unverifiable instead of linting clean', () => {
    const source = `
import { styled } from '@universe/mycelium/styled'
function classes() { return 'p-2' }
export const Frame = styled('div', { base: classes() })
`
    const diagnostics = lintFixture({ source })
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]?.message).toMatch(/Unverifiable/)
  })

  test('resolves a hoisted config object and inspects its class positions', () => {
    const source = `
import { styled } from '@universe/mycelium/styled'
const B = 'flex'
const CONFIG = {
  base: \`\${B} rounded-12\`,
  variants: { tone: { loud: 'bg-surface3' } },
} as const
export const Frame = styled('div', CONFIG)
`
    const diagnostics = lintFixture({ source })
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]?.message).toMatch(/Template literals are banned/)
  })

  test('exempts the styled-factory parity fixtures, which compile their class universes explicitly', () => {
    const parityDir = join(REPO_ROOT, 'packages/tailwind/src/parity/styled-factory/.oxlint-rule-fixtures')
    mkdirSync(parityDir, { recursive: true })
    try {
      const diagnostics = lintFixture({ source: ALL_POSITIONS_FIXTURE, parentDir: parityDir })
      expect(diagnostics).toHaveLength(0)
    } finally {
      rmSync(parityDir, { recursive: true, force: true })
    }
  })
})
