import { readFileSync } from 'node:fs'
import { createRequire, Module } from 'node:module'
import { dirname, join, relative } from 'node:path'
import {
  containerClasses,
  getOptionTextColorClass,
  indicatorPillClasses,
} from '@universe/mycelium/segmented-control-compat'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * Resolved-style parity tests for the SegmentedControl native rebuild
 * (INFRA-2966), dark theme.
 *
 * These assert what the class strings RESOLVE to on device — compiled through
 * uniwind's real Metro pipeline against this app's global.css — never the
 * class names themselves. Class-name assertions stay green when uniwind's
 * build-time class map misses a class (the runtime silently skips unknown
 * classes, uniwind/src/core/native/store.ts), which is exactly how the black
 * root frame and the dark selected-label regression got through CI on this
 * ticket.
 *
 * The dark selected-label regression these tests pin (fourth argent leg): the
 * indicator pill is an absolutely-positioned overlay ABOVE the selected
 * option's label (zIndex 10 — a structural twin of the legacy
 * TabsRovingIndicator). Legacy's dark fill is translucent
 * rgba(255,255,255,0.12), so the white label shows through it; the band
 * around the glyphs flattens over the as-rendered dark surface1 backdrop
 * (#131314) to rgb(47,47,48) = #2F2F30. Pinning that flattened solid as an
 * opaque background (dark:bg-[#2F2F30]) reproduced the band but occluded the
 * label completely — on device every dark row showed an empty pill. The fill
 * must stay translucent: white glyphs under it must stay white while the
 * backdrop under it flattens to #2F2F30.
 */

/**
 * The dark surface1 backdrop as rendered on device (#131314), measured on the
 * third argent leg — the token itself is #131313, the device renders it one
 * blue-byte up. Charlie's #2F2F30 band target is defined against this
 * as-rendered value: 0.12·255 + 0.88·(19,19,20) → rgb(47,47,48).
 */
const DARK_SURFACE1_AS_RENDERED = '#131314'
/** The pinned dark band: legacy's flattened indicator fill over surface1. */
const DARK_BAND_TARGET = '#2f2f30'
/** The selected label's dark glyph color (text-neutral1 in dark). */
const DARK_SELECTED_LABEL = '#ffffff'

type Rgba = { r: number; g: number; b: number; a: number }

/**
 * Parses the #rgb / #rrggbb / #rrggbbaa hex colors uniwind's native compiler
 * emits. Throws on anything else — these tests only ever feed it resolved
 * stylesheet output, so another shape is a defect in the harness.
 */
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

/** Source-over composites a (possibly translucent) fill onto an opaque backdrop. */
function compositeOver(fill: Rgba, backdrop: Rgba): string {
  const channel = (src: number, dst: number): number => Math.round(src * fill.a + dst * (1 - fill.a))
  const toHex = (n: number): string => n.toString(16).padStart(2, '0')
  return `#${toHex(channel(fill.r, backdrop.r))}${toHex(channel(fill.g, backdrop.g))}${toHex(channel(fill.b, backdrop.b))}`
}

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

type ThemeName = 'light' | 'dark'

const SCREEN = { width: 393, height: 852 }

/**
 * Loads uniwind's Metro transformer module and returns its internal
 * `compileCSS` — the exact function Metro runs to build the on-device
 * stylesheet. The transformer does not export it, so the module source is
 * compiled once more with an appended export.
 *
 * SAFETY: `Module.prototype._compile` and `Module._nodeModulePaths` are
 * long-stable Node module internals; compiling the untouched source with the
 * transformer's own filename and resolution paths preserves every relative
 * and package require exactly as a normal `require` would.
 */
function loadCompileCss(): () => Promise<string> {
  const requireFromHere = createRequire(import.meta.url)
  const transformerPath = join(dirname(requireFromHere.resolve('uniwind/metro')), 'transformer.cjs')
  const source = readFileSync(transformerPath, 'utf8')
  const moduleInternals = Module as unknown as {
    _nodeModulePaths: (from: string) => Array<string>
    prototype: { _compile: (source: string, filename: string) => void }
  }
  const compiled = new (Module as unknown as new (
    id: string,
    parent: null,
  ) => {
    filename: string
    paths: Array<string>
    exports: Record<string, unknown>
    _compile: (source: string, filename: string) => void
  })(`${transformerPath}?resolved-style-probe`, null)
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
 * Builds a per-theme style resolver from the compiled virtual stylesheet,
 * mirroring UniwindStore.reinit + resolveStyles (uniwind 1.7.0,
 * src/core/native/store.ts): platform vars merged over base vars, theme vars
 * over those, class lookups silently skipping map misses, `theme`-scoped
 * styles filtered by the active theme, and property getters evaluated against
 * the themed vars.
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

  // The transformer emits the stylesheet as a `rt => ({...})` module body —
  // the same expression Metro inlines into `Uniwind.__reinit`.
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
        // Faithful to the runtime: unknown classes are silently skipped
        // (store.ts). The assertions below must therefore never accept
        // `undefined` as a pass.
        continue
      }
      for (const style of styles) {
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

describe('SegmentedControl resolved styles (uniwind Metro pipeline)', () => {
  let resolve: (classNames: string, theme: ThemeName) => Record<string, unknown>

  beforeAll(async () => {
    const compileCss = loadCompileCss()
    resolve = buildResolver(await compileCss())
  }, 120_000)

  it('resolves the selected label to white in dark mode', () => {
    const labelClass = getOptionTextColorClass({ active: true, hovered: false })
    const color = resolve(labelClass, 'dark')['color']
    expect(color).toBe(DARK_SELECTED_LABEL)
  })

  it('resolves a dark resting pill fill that differs from the selected label color', () => {
    const backgroundColor = resolve(indicatorPillClasses({ hovered: false }), 'dark')['backgroundColor']
    expect(backgroundColor).toBeDefined()
    expect(backgroundColor).not.toBe(DARK_SELECTED_LABEL)
  })

  it('keeps the dark resting pill fill translucent so the label under the overlay shows through', () => {
    // The pill overlays the selected option's label (absolute, zIndex 10).
    // An opaque dark fill occludes the label entirely — the fourth-leg device
    // regression: every dark row rendered an empty pill where "Pools" should
    // be, with the glyph band measuring pure fill.
    const fill = parseHexColor(resolve(indicatorPillClasses({ hovered: false }), 'dark')['backgroundColor'])
    expect(fill.a).toBeLessThan(1)
  })

  it('flattens the dark resting fill over as-rendered surface1 to exactly the pinned #2F2F30 band', () => {
    // Byte parity with the legacy captures per Charlie's direction: legacy's
    // translucent rgba(255,255,255,0.12) fill over the as-rendered dark
    // surface1 backdrop measures rgb(47,47,48) = #2F2F30.
    const fill = parseHexColor(resolve(indicatorPillClasses({ hovered: false }), 'dark')['backgroundColor'])
    expect(compositeOver(fill, parseHexColor(DARK_SURFACE1_AS_RENDERED))).toBe(DARK_BAND_TARGET)
  })

  it('keeps white glyphs white under the dark fill — they must differ from the band', () => {
    // Legacy dark captures show a white-glyph mix inside the pill; the
    // rebuild's glyph pixels are the fill composited over the label color.
    const fill = parseHexColor(resolve(indicatorPillClasses({ hovered: false }), 'dark')['backgroundColor'])
    const glyph = compositeOver(fill, parseHexColor(DARK_SELECTED_LABEL))
    expect(glyph).toBe(DARK_SELECTED_LABEL)
    expect(glyph).not.toBe(DARK_BAND_TARGET)
  })

  it('keeps the light resting pill fill on the bg-surface3 token, translucent', () => {
    const resting = resolve(indicatorPillClasses({ hovered: false }), 'light')
    const token = resolve('bg-surface3', 'light')
    expect(resting['backgroundColor']).toBeDefined()
    expect(resting['backgroundColor']).toBe(token['backgroundColor'])
    expect(parseHexColor(resting['backgroundColor']).a).toBeLessThan(1)
  })

  it.each(['light', 'dark'] as const)('resolves the hover fill to the surface3-hovered token in %s', (theme) => {
    // A class-map miss here would silently render NO fill on hover (the
    // runtime skips unknown classes) — the same mechanism as the black root
    // frame, so the hover fill is pinned as a resolved value too.
    const hovered = resolve(indicatorPillClasses({ hovered: true }), theme)
    const token = resolve('bg-surface3-hovered', theme)
    expect(token['backgroundColor']).toBeDefined()
    expect(hovered['backgroundColor']).toBe(token['backgroundColor'])
  })

  it.each(['light', 'dark'] as const)('resolves the outlined ring to a painted 1px surface3 border in %s', (theme) => {
    // `border border-surface3` resolves through the same class map that
    // silently missed `border-transparent` and let the runtime backfill
    // borderColor #000000 (a solid black ring on device). Pin the RESOLVED
    // border: width 1, color present, on the surface3 token, never the
    // black backfill.
    const outlined = resolve(containerClasses({ size: 'default', outlined: true }), theme)
    const token = resolve('border-surface3', theme)
    expect(outlined['borderWidth']).toBe(1)
    expect(outlined['borderColor']).toBeDefined()
    expect(outlined['borderColor']).toBe(token['borderColor'])
    expect(outlined['borderColor']).not.toBe('#000000')
  })
})
