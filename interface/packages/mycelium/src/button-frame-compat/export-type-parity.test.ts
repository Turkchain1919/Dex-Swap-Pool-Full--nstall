/**
 * TYPE-level export parity across the button-frame-compat platform legs,
 * ported from `../button-compat/export-type-parity.test.ts` (see its header
 * for why a GENERATED tsc probe rather than a static contract file, and for
 * the harness's two safety features: a negative control that must fail
 * `TS2305`, and `if (result.error) throw result.error`).
 *
 * Three leg-sets are covered (frame, text, icon). The native legs
 * deliberately export the SAME type names as web with divergent SHAPES —
 * RNGH press handlers, RN `style` — so name-set equality is asserted first,
 * every name is then import-probed from all legs, and the per-prop shape
 * divergences are pinned with reasons (a new divergence fails; so does a
 * stale pin that stopped diverging).
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

const REPO_ROOT = join(__dirname, '..', '..', '..', '..')
const LEG_DIR = __dirname

interface LegSet {
  name: string
  base: string
  web: string
  native: string
  /** Guards the extractor: fewer names than this means the regex broke. */
  minTypeExports: number
}

const LEG_SETS: LegSet[] = [
  {
    name: 'ButtonFrameCompat',
    base: join(LEG_DIR, 'ButtonFrameCompat.tsx'),
    web: join(LEG_DIR, 'ButtonFrameCompat.web.tsx'),
    native: join(LEG_DIR, 'ButtonFrameCompat.native.tsx'),
    minTypeExports: 1,
  },
  {
    name: 'ButtonTextCompat',
    base: join(LEG_DIR, 'ButtonTextCompat.tsx'),
    web: join(LEG_DIR, 'ButtonTextCompat.web.tsx'),
    native: join(LEG_DIR, 'ButtonTextCompat.native.tsx'),
    minTypeExports: 1,
  },
  {
    name: 'ThemedIconCompat',
    base: join(LEG_DIR, 'ThemedIconCompat.tsx'),
    web: join(LEG_DIR, 'ThemedIconCompat.web.tsx'),
    native: join(LEG_DIR, 'ThemedIconCompat.native.tsx'),
    minTypeExports: 2,
  },
]

// Temp files live under the repo so module/type resolution sees the real
// node_modules (the icon-type-exports.test.ts pattern).
const CACHE_ROOT = join(REPO_ROOT, 'node_modules', '.cache')
mkdirSync(CACHE_ROOT, { recursive: true })
const TEMP_ROOT = mkdtempSync(join(CACHE_ROOT, 'button-frame-compat-export-types-'))

afterAll(() => {
  rmSync(TEMP_ROOT, { recursive: true, force: true })
})

/**
 * The TYPE names a leg exports: its own `export interface` / `export type`
 * declarations plus every name in an `export type { … } from '…'` re-export.
 * Read out of the source so the set can never be stale.
 */
function exportedTypeNames(legPath: string): string[] {
  const source = readFileSync(legPath, 'utf8')
  const names = new Set<string>()
  for (const match of source.matchAll(/^export\s+(?:interface|type)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(match[1] as string)
  }
  for (const block of source.matchAll(/^export\s+type\s*\{([^}]*)\}/gm)) {
    for (const entry of (block[1] as string).split(',')) {
      const name = /^[A-Za-z_$][\w$]*/.exec(entry.replace(/^\s*type\s/, '').trim())?.[0]
      if (name !== undefined) {
        names.add(name)
      }
    }
  }
  return [...names].sort()
}

/** Import specifier for a leg — extensionless, as TS requires. */
function specifier(legPath: string): string {
  return JSON.stringify(legPath.replace(/\.tsx$/, ''))
}

function typecheck(source: string): { ok: boolean; output: string } {
  const dir = mkdtempSync(join(TEMP_ROOT, 'case-'))
  const probePath = join(dir, 'probe.ts')
  writeFileSync(probePath, source)
  const configPath = join(dir, 'tsconfig.json')
  writeFileSync(
    configPath,
    JSON.stringify({
      extends: join(REPO_ROOT, 'config', 'tsconfig', 'app.json'),
      compilerOptions: {
        noEmit: true,
        composite: false,
        noPropertyAccessFromIndexSignature: false,
        types: ['node'],
      },
      files: [join(REPO_ROOT, 'index.d.ts'), join(REPO_ROOT, 'packages', 'mycelium', 'src', 'global.d.ts'), probePath],
    }),
  )
  // `--pretty false` + the env pins keep tsc's output parseable under nx,
  // which injects `FORCE_COLOR` into every forked task and thereby switches
  // tsc to the colourised format `probeDiagnostics`'s `/error TS/` filter
  // cannot match — see ../button-compat/export-type-parity.test.ts.
  const result = spawnSync(
    join(REPO_ROOT, 'node_modules', '.bin', 'tsc'),
    ['-p', configPath, '--noErrorTruncation', '--pretty', 'false'],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    },
  )
  if (result.error) {
    throw result.error
  }
  return { ok: result.status === 0, output: `${result.stdout}${result.stderr}` }
}

/** Diagnostics reported against the generated probe itself. */
function probeDiagnostics(output: string): string[] {
  return output
    .split('\n')
    .filter((line) => /error TS/.test(line))
    .filter((line) => line.includes('probe.ts'))
}

const TSC_TIMEOUT_MS = 300_000

describe('button-frame-compat platform legs export the same TYPE names', () => {
  it.each(LEG_SETS.map((set) => [set.name, set] as const))(
    '%s: the extracted name sets are non-empty and equal across all three legs',
    (_name, set) => {
      const base = exportedTypeNames(set.base)
      expect(base.length, 'no exported types found on the base leg — the extractor broke').toBeGreaterThanOrEqual(
        set.minTypeExports,
      )
      expect(exportedTypeNames(set.web)).toEqual(base)
      expect(exportedTypeNames(set.native)).toEqual(base)
    },
  )

  it(
    'every extracted name imports as a type from ALL THREE legs of every set (tsc)',
    () => {
      const lines: string[] = []
      const refs: string[] = []
      for (const set of LEG_SETS) {
        const names = exportedTypeNames(set.base)
        const prefix = set.name
        lines.push(
          `import type { ${names.map((name) => `${name} as ${prefix}Base${name}`).join(', ')} } from ${specifier(set.base)}`,
          `import type { ${names.map((name) => `${name} as ${prefix}Web${name}`).join(', ')} } from ${specifier(set.web)}`,
          `import type { ${names.map((name) => `${name} as ${prefix}Native${name}`).join(', ')} } from ${specifier(set.native)}`,
        )
        // Reference every name so an elided import can never hide a failure.
        for (const name of names) {
          for (const leg of ['Base', 'Web', 'Native']) {
            refs.push(`export type ${prefix}_${leg}_${name} = ${prefix}${leg}${name}`)
          }
        }
      }
      const result = typecheck([...lines, '', ...refs, ''].join('\n'))
      expect(probeDiagnostics(result.output), result.output.slice(0, 4000)).toEqual([])
      expect(result.ok).toBe(true)
    },
    TSC_TIMEOUT_MS,
  )

  it(
    'negative control: a name no leg exports fails with TS2305',
    () => {
      const set = LEG_SETS[0] as LegSet
      const result = typecheck(
        [
          `import type { DefinitelyNotAButtonFrameCompatExport } from ${specifier(set.native)}`,
          '',
          'export type Probe = DefinitelyNotAButtonFrameCompatExport',
          '',
        ].join('\n'),
      )
      expect(result.ok).toBe(false)
      expect(result.output).toContain('TS2305')
    },
    TSC_TIMEOUT_MS,
  )

  /*
   * SHAPES, NOT JUST NAMES (the button-compat round-1 pattern): each shared
   * prop's type is compared for exact identity across the legs, and the set
   * that legitimately differs is PINNED with its reason. A new divergence
   * fails; so does a stale entry that stopped diverging.
   */
  const FRAME_SHAPE_PINNED_PROPS = [
    'size',
    'variant',
    'emphasis',
    'fill',
    'focusScaling',
    'iconPosition',
    'isDisabled',
    'custom-background-color',
    'primary-color',
    'dd-action-name',
    'backgroundColor',
    'minWidth',
    'minHeight',
    'maxWidth',
    'maxHeight',
    'tag',
    'href',
    'className',
    'children',
    'testID',
    'onPress',
    'onDisabledPress',
    'style',
  ]

  /**
   * Shared props whose type deliberately differs between the legs. The base
   * stub type-re-exports the WEB leg, so `tsc` shows every consumer the DOM
   * handler/style shapes — the same recorded consequence as button-compat's
   * pins (a shared file can use a DOM-only member and throw on device; see
   * that file's KNOWN_SHAPE_DIVERGENCES docs).
   */
  const FRAME_KNOWN_SHAPE_DIVERGENCES: Record<string, string | undefined> = {
    onPress: 'web MouseEventHandler vs native RNGH PressableProps["onPress"]',
    onDisabledPress: 'web MouseEventHandler vs native RNGH PressableProps["onPress"]',
    style: 'web CSSProperties vs native StyleProp<ViewStyle>',
  }

  it(
    'every shared frame prop is type-IDENTICAL across the legs, except the pinned divergences (tsc)',
    () => {
      const frame = LEG_SETS[0] as LegSet
      const text = LEG_SETS[1] as LegSet
      const eq = 'type Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false'
      const lines = [
        `import type { ButtonFrameCompatProps as WebProps } from ${specifier(frame.web)}`,
        `import type { ButtonFrameCompatProps as NativeProps } from ${specifier(frame.native)}`,
        `import type { ButtonTextCompatProps as WebTextProps } from ${specifier(text.web)}`,
        `import type { ButtonTextCompatProps as NativeTextProps } from ${specifier(text.native)}`,
        '',
        eq,
        '',
        ...FRAME_SHAPE_PINNED_PROPS.map((prop, index) => {
          const expected = FRAME_KNOWN_SHAPE_DIVERGENCES[prop] === undefined ? 'true' : 'false'
          const safe = prop.replace(/[^A-Za-z0-9]/g, '_')
          return `export const frame_${index}_${safe}: Eq<WebProps[${JSON.stringify(prop)}], NativeProps[${JSON.stringify(prop)}]> = ${expected}`
        }),
        '',
        // Text legs: `style` is the one pinned divergence (RN TextStyle).
        'export const text_style: Eq<WebTextProps["style"], NativeTextProps["style"]> = false',
        ...['color', 'lineHeightDisabled', 'children', 'size', 'variant', 'emphasis', 'isDisabled'].map(
          (prop) =>
            `export const text_${prop}: Eq<WebTextProps[${JSON.stringify(prop)}], NativeTextProps[${JSON.stringify(prop)}]> = true`,
        ),
        '',
      ].join('\n')
      const result = typecheck(lines)
      expect(probeDiagnostics(result.output), result.output.slice(0, 4000)).toEqual([])
      expect(result.ok).toBe(true)
    },
    TSC_TIMEOUT_MS,
  )

  it('every pinned divergence is a prop the shape probe actually checks', () => {
    for (const prop of Object.keys(FRAME_KNOWN_SHAPE_DIVERGENCES)) {
      expect(FRAME_SHAPE_PINNED_PROPS, `${prop} is pinned as divergent but never probed`).toContain(prop)
    }
    expect(FRAME_SHAPE_PINNED_PROPS.length).toBeGreaterThan(15)
  })
})
