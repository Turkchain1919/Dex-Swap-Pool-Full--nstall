/**
 * ButtonCompat WEB OUTPUT PIN (INFRA-3230).
 *
 * ButtonCompat's parity proof is 2,912 computed-style cell-pairs produced by
 * `labs/workbench/scripts/verify-button-parity.mts` against the real legacy
 * Tamagui Button. That proof is a statement about the CSS the emitted class
 * string resolves to — so ANY change to the emitted string invalidates it,
 * silently, without the workbench being re-run.
 *
 * INFRA-3230 extracts the class logic out of the render into `./compile` (the
 * native parity harness needs a pure `(props) => string`) and decomposes the
 * [variant][emphasis] tables by interaction scope. Both are meant to be
 * strictly behaviour-preserving on web. This file is the pin that says so:
 *
 *  1. A digest over `renderToStaticMarkup` for the full
 *     variant × emphasis × size × fill × iconPosition × focusScaling × state
 *     matrix (8,960 cases). Not just the classes, the whole DOM (tags,
 *     attribute order, inline styles, the spinner SVG). If a single byte moves
 *     anywhere in the matrix, this fails. See the pin-history note on
 *     PINNED_MARKUP_DIGEST for when regenerating it is legitimate.
 *  2. The 32 re-joined [variant][emphasis] cells, verbatim, for both tables.
 *     The digest already covers them, but a digest mismatch is unreadable;
 *     these make a regression say which cell moved.
 *  3. That the extracted `buttonCompatFrameClassName` returns exactly the
 *     class string the component puts on its `<button>` — the property the
 *     native harness's `NativeParitySuiteConfig.className` relies on.
 */
import { createHash } from 'node:crypto'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ButtonCompat } from './ButtonCompat'
import {
  buttonCompatFrameClassName,
  buttonCompatIconClassName,
  buttonCompatTextClassName,
  FRAME_SCOPE_PREFIXES,
  SPINNER_GLYPH,
  TEXT_SCOPE_PREFIXES,
  variantEmphasisClass,
} from './compile'
import type { ButtonEmphasis, ButtonFocusScaling, ButtonIconPosition, ButtonSize, ButtonVariant } from './compile'
import {
  FRAME_JOINED_CELLS,
  FRAME_VARIANT_EMPHASIS,
  joinScopes,
  TEXT_JOINED_CELLS,
  TEXT_VARIANT_EMPHASIS,
} from './variantEmphasisHash'

const VARIANTS: ButtonVariant[] = ['default', 'branded', 'critical', 'warning']
const EMPHASES: ButtonEmphasis[] = ['primary', 'secondary', 'tertiary', 'text-only']
const SIZES: ButtonSize[] = ['xxsmall', 'xsmall', 'small', 'medium', 'large']
const FOCUS: ButtonFocusScaling[] = ['default', 'equal', 'equal:smaller-button', 'more-x']
const ICON_POSITIONS: ButtonIconPosition[] = ['before', 'after']

/**
 * The state pool: every branch `getStateClasses` / `getCustomStyle` can take
 * (at rest, blocked-disabled, interactive-while-disabled, loading, custom
 * background with and without `primary-color`) plus the text-only
 * `lineHeightDisabled` branch.
 */
const STATES = [
  { key: 'rest', props: {} },
  { key: 'disabled', props: { disabled: true } },
  { key: 'disabled+onDisabledPress', props: { disabled: true, onDisabledPress: () => undefined } },
  { key: 'loading', props: { loading: true } },
  { key: 'customBg', props: { backgroundColor: '#fa2' } },
  { key: 'customBg+primaryColor', props: { backgroundColor: 'rgb(10, 20, 30)', 'primary-color': '#0af' } },
  { key: 'lineHeightDisabled', props: { lineHeightDisabled: true } },
] as const

/**
 * Digest of the rendered markup over the full matrix. Regenerating this
 * constant is only legitimate alongside a re-run of
 * `labs/workbench/scripts/verify-button-parity.mts` — the 2,912-cell-pair
 * proof is what it stands in for.
 *
 * Pin history (dated, per the INFRA-3097 exception protocol):
 * - af7ddaf3: captured from the pre-INFRA-3230-refactor implementation
 *   (441b18eb…), standing in for the 2026-07-28 2,912/0 workbench run.
 * - 2026-08-04 (INFRA-3255 ruling, Charlie Bachmeier): re-pinned after the
 *   default/primary cell swapped to the canonical bg-neutral1 family — the one
 *   sanctioned emitted-string change. verify-button-parity.mts was re-run the
 *   same day on both sides of the swap: 2,912 cells, 0 unexplained, and the
 *   computed-style captures byte-identical (--accent3: var(--neutral1), so the
 *   rendered values did not move). Ledger:
 *   labs/workbench/scripts/button-parity-exceptions.ts.
 */
const PINNED_MARKUP_DIGEST = 'd90f46b6647b0ed89255615656d8a9f412e68b2f78cc89821c69a2d63f3f3eec'
const PINNED_MATRIX_SIZE = 8960

interface MatrixCase {
  key: string
  variant: ButtonVariant
  emphasis: ButtonEmphasis
  size: ButtonSize
  fill: boolean
  iconPosition: ButtonIconPosition
  focusScaling: ButtonFocusScaling
  stateKey: string
  stateProps: Record<string, unknown>
}

function buildMatrix(): MatrixCase[] {
  const cases: MatrixCase[] = []
  for (const variant of VARIANTS) {
    for (const emphasis of EMPHASES) {
      for (const size of SIZES) {
        for (const fill of [true, false]) {
          for (const iconPosition of ICON_POSITIONS) {
            for (const focusScaling of FOCUS) {
              for (const state of STATES) {
                cases.push({
                  key: `${variant}|${emphasis}|${size}|fill=${fill}|${iconPosition}|${focusScaling}|${state.key}`,
                  variant,
                  emphasis,
                  size,
                  fill,
                  iconPosition,
                  focusScaling,
                  stateKey: state.key,
                  stateProps: state.props,
                })
              }
            }
          }
        }
      }
    }
  }
  return cases
}

function renderCase(matrixCase: MatrixCase): string {
  return renderToStaticMarkup(
    <ButtonCompat
      variant={matrixCase.variant}
      emphasis={matrixCase.emphasis}
      size={matrixCase.size}
      fill={matrixCase.fill}
      iconPosition={matrixCase.iconPosition}
      focusScaling={matrixCase.focusScaling}
      icon={<svg />}
      testID="tid"
      {...matrixCase.stateProps}
    >
      Swap
    </ButtonCompat>,
  )
}

describe('ButtonCompat web output is byte-identical across the full matrix', () => {
  const matrix = buildMatrix()

  it('covers the pinned matrix size', () => {
    expect(matrix).toHaveLength(PINNED_MATRIX_SIZE)
  })

  it('renders the pinned markup digest (the workbench parity proof stays valid)', () => {
    const body = matrix.map((matrixCase) => `${matrixCase.key}\t${renderCase(matrixCase)}`).join('\n')
    expect(createHash('sha256').update(body).digest('hex')).toBe(PINNED_MARKUP_DIGEST)
  })

  it('emits the frame class string the compiler produces (the native harness contract)', () => {
    // The harness types `NativeParitySuiteConfig.className` as
    // `(props: P) => string`; this is the property that makes the extracted
    // compiler usable as that callback.
    const mismatches: string[] = []
    for (const matrixCase of matrix) {
      const rendered = /class="([^"]*)"/.exec(renderCase(matrixCase))?.[1]
      const compiled = buttonCompatFrameClassName({
        variant: matrixCase.variant,
        emphasis: matrixCase.emphasis,
        size: matrixCase.size,
        fill: matrixCase.fill,
        iconPosition: matrixCase.iconPosition,
        focusScaling: matrixCase.focusScaling,
        ...matrixCase.stateProps,
      })
      if (compiled !== rendered) {
        mismatches.push(`${matrixCase.key}\n  rendered: ${rendered}\n  compiled: ${compiled}`)
      }
    }
    expect(mismatches).toEqual([])
  })
})

/* ------------------- the 32 scope-decomposed cells, verbatim ------------------ */

/*
 * The literal joined strings now live in `./variantEmphasisHash`
 * (FRAME_JOINED_CELLS / TEXT_JOINED_CELLS) rather than here, because they are
 * load-bearing for the Tailwind Oxide scanner, not just for this pin: after the
 * scope decomposition they are the only source text in which the prefixed
 * compat classes appear at all, and a test file is the wrong owner for
 * something the compiled stylesheet depends on. The assertions below are
 * unchanged in substance — they still compare the runtime `joinScopes` output
 * against an independently written literal, cell by cell, so the two cannot
 * drift. `web-css-coverage.test.ts` carries the set-level equality plus the
 * compiled-CSS coverage check.
 */

describe('scope-decomposed [variant][emphasis] cells re-join to the pinned web strings', () => {
  const cells = VARIANTS.flatMap((variant) => EMPHASES.map((emphasis) => [variant, emphasis] as const))

  it.each(cells)('frame %s/%s', (variant, emphasis) => {
    expect(joinScopes(FRAME_VARIANT_EMPHASIS[variant][emphasis], FRAME_SCOPE_PREFIXES)).toBe(
      FRAME_JOINED_CELLS[variant][emphasis],
    )
  })

  it.each(cells)('text %s/%s', (variant, emphasis) => {
    expect(joinScopes(TEXT_VARIANT_EMPHASIS[variant][emphasis], TEXT_SCOPE_PREFIXES)).toBe(
      TEXT_JOINED_CELLS[variant][emphasis],
    )
  })
})

describe('out-of-enum degradation survives the decomposition', () => {
  it('unknown variant degrades to the default row', () => {
    expect(variantEmphasisClass({ map: FRAME_VARIANT_EMPHASIS, variant: 'spore-3000', emphasis: 'secondary' })).toBe(
      FRAME_VARIANT_EMPHASIS.default.secondary,
    )
  })

  it("unknown emphasis degrades to that row's primary cell", () => {
    expect(variantEmphasisClass({ map: FRAME_VARIANT_EMPHASIS, variant: 'critical', emphasis: 'quaternary' })).toBe(
      FRAME_VARIANT_EMPHASIS.critical.primary,
    )
  })

  it('both unknown degrades to default/primary', () => {
    expect(variantEmphasisClass({ map: TEXT_VARIANT_EMPHASIS, variant: 'nope', emphasis: 'nope' })).toBe(
      TEXT_VARIANT_EMPHASIS.default.primary,
    )
  })
})

/** `[&_svg]:…` arbitrary variants come back HTML-escaped out of the markup. */
const unescape = (value: string): string => value.replaceAll('&amp;', '&')

describe('the subcomponent class selectors are pure and exported', () => {
  it('text selector reproduces the rendered span classes', () => {
    const markup = renderToStaticMarkup(<ButtonCompat variant="branded">Swap</ButtonCompat>)
    const spanClass = [...markup.matchAll(/class="([^"]*)"/g)].map((m) => unescape(m[1] ?? '')).at(-1)
    expect(
      buttonCompatTextClassName({ variant: 'branded', emphasis: 'primary', size: 'medium', isDisabled: false }),
    ).toBe(spanClass)
  })

  it('icon selector reproduces the rendered icon-wrapper classes', () => {
    const markup = renderToStaticMarkup(
      <ButtonCompat variant="critical" emphasis="tertiary" size="large" icon={<svg />}>
        Swap
      </ButtonCompat>,
    )
    const iconClass = [...markup.matchAll(/class="([^"]*)"/g)].map((m) => unescape(m[1] ?? ''))[1]
    expect(
      buttonCompatIconClassName({ variant: 'critical', emphasis: 'tertiary', size: 'large', isDisabled: false }),
    ).toBe(iconClass)
  })
})

/**
 * SPINNER_GLYPH exists because the native leg cannot inherit `currentColor` and
 * has to rebuild the same circle as `react-native-svg` elements. The web leg
 * deliberately keeps its literals so this file's byte-pinned DOM is untouched —
 * which means the shared constant could silently drift from what web paints.
 * This is the pin that stops it: every value is read back out of the RENDERED
 * web markup.
 */
describe('SPINNER_GLYPH matches the glyph the web leg actually renders', () => {
  const markup = renderToStaticMarkup(<ButtonCompat loading>Swap</ButtonCompat>)
  const paths = [...markup.matchAll(/<path\b([^>]*)>/g)].map((m) => m[1] as string)
  const attr = (tag: string, name: string): string | undefined => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1]

  it('the web leg renders the two-path circle this constant describes', () => {
    expect(paths, 'the web spinner is not two paths any more').toHaveLength(2)
    expect(markup).toContain(`viewBox="${SPINNER_GLYPH.viewBox}"`)
  })

  it('both path geometries and stroke settings are the shared values', () => {
    expect(attr(paths[0] as string, 'd')).toBe(SPINNER_GLYPH.trackPath)
    expect(attr(paths[1] as string, 'd')).toBe(SPINNER_GLYPH.arcPath)
    expect(attr(paths[0] as string, 'opacity')).toBe(SPINNER_GLYPH.trackOpacity)
    for (const tag of paths) {
      expect(attr(tag as string, 'stroke-width')).toBe(SPINNER_GLYPH.strokeWidth)
      expect(attr(tag as string, 'stroke-linecap')).toBe('round')
      // Web's mechanism, and precisely the one native cannot use.
      expect(attr(tag as string, 'stroke')).toBe('currentColor')
    }
  })
})
