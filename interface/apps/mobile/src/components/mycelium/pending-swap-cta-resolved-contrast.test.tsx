/**
 * Class-name assertions cannot cover this: the native runtime silently skips classes missing from
 * uniwind's build-time map (uniwind/src/core/native/store.ts), so only values resolved from the real
 * compiled stylesheet prove what renders on device. Frame and label must also resolve from the SAME
 * stylesheet — they come from two Button families whose class strings are each correct in isolation.
 */
import { readFileSync } from 'node:fs'
import { createRequire, Module } from 'node:module'
import { dirname, join, relative } from 'node:path'
import { TradingApi } from '@universe/api'
import type { JSX } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { MIN_COLOR_CONTRAST_THRESHOLD } from 'ui/src'
import { PendingSwapButtonContent } from 'uniswap/src/features/transactions/swap/review/SwapReviewScreen/SwapReviewFooter/PendingSwapButtonContent'
import { beforeAll, describe, expect, it } from 'vitest'

type ThemeName = 'light' | 'dark'

type Rgba = { r: number; g: number; b: number; a: number }

const SCREEN = { width: 393, height: 852 }

type CompiledStyle = {
  entries: Array<[string, (this: Record<string, unknown>) => unknown]>
  theme: string | null
  minWidth: number
  maxWidth: number
  orientation: string | null
  rtl: boolean | null
  active: boolean | null
  focus: boolean | null
  disabled: boolean | null
  dataAttributes: Record<string, string> | null
  complexity: number
  importantProperties: Array<string>
}

type CompiledConfig = {
  stylesheet: Record<string, Array<CompiledStyle>>
  vars: Record<string, unknown>
  scopedVars: Record<string, Record<string, unknown> | undefined>
}

/**
 * uniwind's Metro transformer does not export `compileCSS`, so its untouched source is compiled once
 * more with an appended export, under the transformer's own filename and resolution paths so every
 * relative and package require resolves exactly as `require` would.
 */
function loadCompileCss(): () => Promise<string> {
  const requireFromHere = createRequire(import.meta.url)
  const transformerPath = join(dirname(requireFromHere.resolve('uniwind/metro')), 'transformer.cjs')
  const source = readFileSync(transformerPath, 'utf8')
  const moduleInternals = Module as unknown as {
    _nodeModulePaths: (from: string) => Array<string>
  }
  const compiled = new (Module as unknown as new (
    id: string,
    parent: null,
  ) => {
    filename: string
    paths: Array<string>
    exports: Record<string, unknown>
    _compile: (source: string, filename: string) => void
  })(`${transformerPath}?pending-cta-contrast`, null)
  compiled.filename = transformerPath
  compiled.paths = moduleInternals._nodeModulePaths(dirname(transformerPath))
  compiled._compile(
    `${source}\nmodule.exports.__compileCSS = compileCSS;\nmodule.exports.__config = config;\n`,
    transformerPath,
  )
  const exported = compiled.exports as {
    __compileCSS: (config: unknown) => Promise<string>
    __config: { UniwindBundlerConfig: { fromMetroConfig: (uniwind: unknown, platform: string) => unknown } }
  }
  const cssEntryFile = relative(process.cwd(), join(dirname(new URL(import.meta.url).pathname), '../../global.css'))
  const bundlerConfig = exported.__config.UniwindBundlerConfig.fromMetroConfig({ cssEntryFile }, 'ios')
  return async () => exported.__compileCSS(bundlerConfig)
}

/**
 * Mirrors UniwindStore.reinit + resolveStyles (uniwind 1.7.0, src/core/native/store.ts): platform
 * vars, then theme vars over those, then class lookups that silently skip map misses.
 */
function buildResolver(virtualCode: string): (classNames: string, theme: ThemeName) => Record<string, unknown> {
  const cloneWithAccessors = (source: Record<string, unknown>): Record<string, unknown> => {
    const clone: Record<string, unknown> = {}
    Object.defineProperties(clone, Object.getOwnPropertyDescriptors(source))
    return clone
  }

  const runtimeStub = {
    colorScheme: 'dark' as ThemeName,
    currentThemeName: 'dark' as ThemeName,
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    screen: SCREEN,
    orientation: 'portrait',
    rtl: false,
    pixelRatio: 3,
    fontScale: 1,
    hairlineWidth: 1 / 3,
    parseColor: (fn: string): string => {
      throw new Error(`Unexpected runtime parseColor(${fn}) call in resolved-style test`)
    },
    lightDark: (light: unknown, dark: unknown): unknown => (runtimeStub.colorScheme === 'dark' ? dark : light),
  }

  // oxlint-disable-next-line typescript/no-implied-eval -- evaluating uniwind's generated stylesheet module, exactly as the native runtime does
  const config = new Function('rt', `return ${virtualCode}`)(runtimeStub) as CompiledConfig
  const { scopedVars, stylesheet, vars } = config

  for (const platform of ['native', 'ios']) {
    const platformVars = scopedVars[`__uniwind-platform-${platform}`]
    if (platformVars) {
      Object.defineProperties(vars, Object.getOwnPropertyDescriptors(platformVars))
    }
  }
  const themedVars = Object.fromEntries(
    (['light', 'dark'] as const).map((theme) => {
      const cloned = cloneWithAccessors(vars)
      const themeVars = scopedVars[`__uniwind-theme-${theme}`]
      if (themeVars) {
        Object.defineProperties(cloned, Object.getOwnPropertyDescriptors(themeVars))
      }
      return [theme, cloned]
    }),
  ) as Record<ThemeName, Record<string, unknown>>

  return (classNames, theme) => {
    runtimeStub.colorScheme = theme
    runtimeStub.currentThemeName = theme
    const result: Record<string, unknown> = {}
    const varsForTheme = cloneWithAccessors(themedVars[theme])
    const bestBreakpoints = new Map<string, CompiledStyle>()
    for (const className of classNames.split(' ')) {
      const styles = stylesheet[className]
      if (styles === undefined) {
        // Matches the runtime, so no assertion below may accept `undefined` as a pass.
        continue
      }
      for (const style of styles) {
        // Resting state only: the CTA's disabled cell arrives as its own class from React context,
        // not as a `disabled:` variant, so skipping those drops nothing.
        if (
          style.minWidth > SCREEN.width ||
          style.maxWidth < SCREEN.width ||
          (style.theme !== null && theme !== style.theme) ||
          (style.orientation !== null && style.orientation !== 'portrait') ||
          style.rtl === true ||
          style.active !== null ||
          style.focus !== null ||
          style.disabled !== null ||
          style.dataAttributes !== null
        ) {
          continue
        }
        for (const [property, valueGetter] of style.entries) {
          const previousBest = bestBreakpoints.get(property)
          if (
            previousBest &&
            (previousBest.minWidth > style.minWidth ||
              previousBest.complexity > style.complexity ||
              previousBest.importantProperties.includes(property))
          ) {
            continue
          }
          if (property.startsWith('-')) {
            Object.defineProperty(varsForTheme, property, { configurable: true, enumerable: true, get: valueGetter })
          } else {
            Object.defineProperty(result, property, {
              configurable: true,
              enumerable: true,
              get: () => valueGetter.call(varsForTheme),
            })
          }
          bestBreakpoints.set(property, style)
        }
      }
    }
    return { ...result }
  }
}

function parseHexColor(value: unknown): Rgba {
  if (typeof value !== 'string' || !/^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) {
    throw new Error(`Expected a resolved #rrggbb(aa) color, got ${JSON.stringify(value)}`)
  }
  const hex = value.slice(1)
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
    a: hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1,
  }
}

function compositeOver(fill: Rgba, backdrop: Rgba): Rgba {
  const channel = (src: number, dst: number): number => Math.round(src * fill.a + dst * (1 - fill.a))
  return { r: channel(fill.r, backdrop.r), g: channel(fill.g, backdrop.g), b: channel(fill.b, backdrop.b), a: 1 }
}

/** WCAG 2.1 relative luminance; the literals are the spec's. */
function relativeLuminance({ r, g, b }: Rgba): number {
  const channel = (value: number): number => {
    const srgb = value / 255
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrastRatio(label: Rgba, backdrop: Rgba): number {
  const labelLuminance = relativeLuminance(compositeOver(label, backdrop))
  const backdropLuminance = relativeLuminance(backdrop)
  const lighter = Math.max(labelLuminance, backdropLuminance)
  const darker = Math.min(labelLuminance, backdropLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

type StyledNode = { className: string; text: string | undefined }

/** Every classed node, in tree order — the frame is the outermost one. */
function styledNodes(tree: ReactTestRenderer): StyledNode[] {
  const nodes = tree.root.findAll(() => true, { deep: true }) as unknown as Array<{
    props: Record<string, unknown>
  }>
  const out: StyledNode[] = []
  for (const node of nodes) {
    const className = node.props['className']
    if (typeof className !== 'string' || className === '') {
      continue
    }
    const children = node.props['children']
    out.push({ className, text: typeof children === 'string' ? children : undefined })
  }
  return out
}

const STEPS = [{ stepType: TradingApi.PlanStepType.BRIDGE, tokenInChainId: TradingApi.ChainId._1 }] as const

describe('pending swap CTA resolved contrast (uniwind Metro pipeline)', () => {
  let resolve: (classNames: string, theme: ThemeName) => Record<string, unknown>

  beforeAll(async () => {
    const compileCss = loadCompileCss()
    resolve = buildResolver(await compileCss())
  }, 120_000)

  // No `submissionText` is the cross-chain swap path; explicit text is the Earn review sheet's.
  const paths = [
    { name: 'delayed submission text', submissionText: undefined },
    { name: 'explicit submission text', submissionText: 'Submitting swap…' },
  ] as const
  const cases = (['light', 'dark'] as const).flatMap((theme) => paths.map((path) => ({ theme, path })))

  it.each(cases)('label clears the contrast floor over its frame — $path.name, $theme', async ({ theme, path }) => {
    let tree!: ReactTestRenderer
    await act(async () => {
      tree = create(
        (
          <PendingSwapButtonContent
            disabled
            currentStepIndex={1}
            steps={STEPS}
            submissionText={path.submissionText}
            onSubmit={(): undefined => undefined}
          />
        ) as JSX.Element,
      )
    })

    const nodes = styledNodes(tree)
    // The label needs the string-child filter: the react-native-web host node under it carries the
    // same text but no uniwind class.
    const frames = nodes.filter((node) => typeof resolve(node.className, theme)['backgroundColor'] === 'string')
    const labels = nodes.filter(
      (node) => node.text !== undefined && typeof resolve(node.className, theme)['color'] === 'string',
    )
    // One frame, but react-test-renderer repeats it per composite wrapper, so pin the distinct
    // class strings: a second classed background node would be measured instead of the frame.
    expect(new Set(frames.map((node) => node.className)).size).toBe(1)
    expect(labels).toHaveLength(1)

    const frameBackground = resolve(frames[0]!.className, theme)['backgroundColor']
    const labelColor = resolve(labels[0]!.className, theme)['color']

    const ratio = contrastRatio(parseHexColor(labelColor), parseHexColor(frameBackground))
    expect(ratio).toBeGreaterThanOrEqual(MIN_COLOR_CONTRAST_THRESHOLD)
  })
})
