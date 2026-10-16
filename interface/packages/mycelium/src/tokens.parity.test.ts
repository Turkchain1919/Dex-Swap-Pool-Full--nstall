// oxlint-disable typescript/no-unnecessary-condition -- this file typechecks under tsconfig.test.json (noUncheckedIndexedAccess), outside the composite program the type-aware lint models
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { heights as tailwindHeights, radii, typography } from '@universe/tailwind'
import {
  borderRadii as uiBorderRadii,
  fonts as uiFonts,
  iconSizes as uiIconSizes,
  imageSizes as uiImageSizes,
  INTERFACE_NAV_HEIGHT as uiInterfaceNavHeight,
  spacing as uiSpacing,
  themes as uiThemes,
  zIndexes as uiZIndexes,
} from 'ui/src/theme'
import { describe, expect, it } from 'vitest'
import { RADIUS_TOKEN_PX, Z_INDEX_TOKEN, type SporeSpaceToken } from './compat/tokens'
import type { FontVariantName } from './font-tokens.web'
import { getTokenValue } from './get-token-value'
import { nativeFontsTable } from './native-fonts-table'
import { THEME_COLOR_TOKENS } from './text-compat/theme-tokens.generated'
import { borderRadii, fonts, heights, iconSizes, imageSizes, spacing, zIndexes } from './tokens'

/**
 * INFRA-2951 exit test — token-constants compat.
 *
 * Layer 1: each Mycelium constant family must be member-for-member equal to
 * its ui/src/theme equivalent, resolved exactly as the web app resolves it
 * (web platform splits + APP_ID=web, see vitest.config.ts).
 *
 * Layer 1b: `fonts` is the one PLATFORM-RESOLVED family and this config can
 * only see its web leg. What it can still pin against ui is the native table's
 * identity column — `smallFont: true`, where `adjustedSize` is a no-op — with
 * `family` the deliberate exception, since it resolves to the real React Native
 * family name. The non-CJK device column, where the +1 ramp shows, is pinned in
 * packages/tailwind/src/parity/fonts-token/native-parity.test.ts; a green run
 * here is NOT native evidence.
 *
 * Layer 2 (derivation honesty guard): the `@universe/tailwind` TS token
 * values Mycelium derives from must equal the values parsed out of that
 * package's own css/theme.css. This pins the TS mirror to the CSS source of
 * truth, so a Layer 1 pass can never come from ui literals smuggled into the
 * derivation chain.
 *
 * A Layer 1 failure is token drift (or a token missing from
 * `@universe/tailwind` entirely) — never "fix" it by hardcoding the ui value.
 * Drift ledger: INFRA-2951.
 */

describe('mycelium tokens ↔ ui/src/theme parity (INFRA-2951 exit test)', () => {
  it('iconSizes', () => {
    expect(iconSizes).toEqual(uiIconSizes)
  })

  it('spacing', () => {
    expect(spacing).toEqual(uiSpacing)
  })

  it('imageSizes', () => {
    expect(imageSizes).toEqual(uiImageSizes)
  })

  it('zIndexes', () => {
    expect(zIndexes).toEqual(uiZIndexes)
  })

  it('fonts', () => {
    expect(fonts).toEqual(uiFonts)
  })

  /**
   * The native table's identity column against ui: every member but `family`
   * must match, and `family` must be the real RN name, not the Tamagui key.
   */
  it('fonts (native table, CJK identity column) matches ui except the resolved family', () => {
    const nativeFonts = nativeFontsTable({ platform: 'ios', smallFont: true })
    // Widened to a string index so the two separately-keyed records can be
    // walked together; the key-set equality asserted first makes it exhaustive.
    const uiTable: Readonly<Record<string, Record<string, unknown>>> = uiFonts
    expect(Object.keys(nativeFonts).sort()).toEqual(Object.keys(uiTable).sort())
    for (const variant of Object.keys(nativeFonts) as FontVariantName[]) {
      const nativeEntry = nativeFonts[variant]
      expect({ ...nativeEntry, family: undefined }, variant).toEqual({ ...uiTable[variant], family: undefined })
      expect(nativeEntry.family, `${variant} family`).toBe(
        variant === 'monospace' ? 'InputMono-Regular' : 'Basel Grotesk',
      )
    }
  })

  it('borderRadii', () => {
    expect(borderRadii).toEqual(uiBorderRadii)
  })

  // ui/src/theme/heights.ts has no family object — just the scalar constant —
  // so each member is pinned individually to its ui scalar.
  it('heights', () => {
    expect(heights).toEqual({ 'interface-nav': uiInterfaceNavHeight })
  })

  /**
   * Colour-table MEMBERSHIP, closing the gap the other families never had:
   * the generated --stext mirror must carry every ui theme colour token, or a
   * new token silently throws in TextCompat while the web app renders it
   * (INFRA-3244 — exactly how `chain_57073` rotted). Value parity is pinned
   * by scripts/text-compat-tokens.test.ts and the byte-identical CSS render.
   */
  it('text-compat theme colour tokens', () => {
    expect([...THEME_COLOR_TOKENS]).toEqual(Object.keys(uiThemes.light).sort())
  })

  /**
   * The `$`-prefixed compat token maps mirror the legacy Tamagui token
   * families, which add a `true` default alias on top of the base constants
   * (`ui/src/theme/tokens.ts`: `zIndex = { ...zIndexes, true: zIndexes.default }`,
   * `radius = { ...borderRadii, true: borderRadii.none }`) — INFRA-3232.
   */
  it('Z_INDEX_TOKEN mirrors the legacy zIndex token map', () => {
    expect(Z_INDEX_TOKEN).toEqual(
      Object.fromEntries(
        Object.entries({ ...uiZIndexes, true: uiZIndexes.default }).map(([key, value]) => [`$${key}`, value]),
      ),
    )
  })

  it('RADIUS_TOKEN_PX mirrors the legacy radius token map', () => {
    expect(RADIUS_TOKEN_PX).toEqual(
      Object.fromEntries(
        Object.entries({ ...uiBorderRadii, true: uiBorderRadii.none }).map(([key, value]) => [`$${key}`, value]),
      ),
    )
  })

  // getTokenValue must return what the legacy Tamagui resolver returned for
  // every covered category; unknown tokens throw instead of Tamagui's silent undefined.
  describe('getTokenValue', () => {
    it('space/size tokens resolve to the legacy spacing/padding/gap values', () => {
      // The migrating call sites' exact tokens first (FavoriteTokensGrid,
      // PlanStepItem/StepRowSkeleton constants), then the whole family.
      expect(getTokenValue('$spacing8')).toBe(uiSpacing.spacing8)
      const legacySpace: Record<string, number> = {
        ...uiSpacing,
        // ui/src/theme/spacing.ts padding/gap families (derived from spacing).
        padding6: 6,
        padding8: 8,
        padding12: 12,
        padding16: 16,
        padding20: 20,
        padding24: 24,
        padding36: 36,
        gap2: 2,
        gap4: 4,
        gap8: 8,
        gap12: 12,
        gap16: 16,
        gap20: 20,
        gap24: 24,
        gap32: 32,
        gap36: 36,
        true: uiSpacing.spacing8,
      }
      for (const [name, value] of Object.entries(legacySpace)) {
        // SAFETY: every key above is a covered space token; the dynamic
        // template defeats the literal-union narrowing this test also pins.
        const token = `$${name}` as SporeSpaceToken
        expect(getTokenValue(token), name).toBe(value)
        expect(getTokenValue(token, 'space'), name).toBe(value)
        expect(getTokenValue(token, 'size'), name).toBe(value)
      }
    })

    it('icon tokens resolve to the legacy iconSize values (dotted specific-token names)', () => {
      expect(getTokenValue('$icon.20')).toBe(uiIconSizes.icon20)
      expect(getTokenValue('$icon.24', 'icon')).toBe(uiIconSizes.icon24)
      expect(getTokenValue('$icon.true')).toBe(uiIconSizes.icon40)
    })

    it('image tokens resolve to the legacy imageSize values', () => {
      expect(getTokenValue('$image.image40')).toBe(uiImageSizes.image40)
      expect(getTokenValue('$image.true', 'image')).toBe(uiImageSizes.image40)
    })

    it('radius and zIndex tokens resolve to the legacy values', () => {
      expect(getTokenValue('$rounded12', 'radius')).toBe(uiBorderRadii.rounded12)
      expect(getTokenValue('$modal', 'zIndex')).toBe(uiZIndexes.modal)
      // Category-less flat names follow the legacy config's insertion order
      // (space before zIndex before radius): `$true` is the space alias.
      expect(getTokenValue('$true')).toBe(uiSpacing.spacing8)
    })

    it('throws LOUDLY on unknown tokens and categories (never 0/undefined)', () => {
      // Uncovered tokens now also FAIL TYPECHECK at call sites (the
      // codemod's tsc-proves-the-swap premise); the @ts-expect-error pins
      // that compile-time half while the assertions pin the runtime throw
      // for widened-string escapes.
      // @ts-expect-error -- '$paddingBogus' is deliberately outside every covered category
      expect(() => getTokenValue('$paddingBogus')).toThrowError(/unknown token "\$paddingBogus"/)
      // @ts-expect-error -- '$spacing8000' is deliberately outside the space category
      expect(() => getTokenValue('$spacing8000', 'space')).toThrowError(/covered categories/)
      // @ts-expect-error -- 'auto' is a Tamagui passthrough value, deliberately uncovered
      expect(() => getTokenValue('auto')).toThrowError(/unknown token/)
      // A known token in the WRONG category is loud too.
      // @ts-expect-error -- '$icon.20' is an icon token, not a space token
      expect(() => getTokenValue('$icon.20', 'space')).toThrowError(/in category "space"/)
    })
  })
})

// ── Layer 2: @universe/tailwind TS tokens ↔ css/theme.css ─────────────────

const themeCss = readFileSync(createRequire(import.meta.url).resolve('@universe/tailwind/theme'), 'utf8')

/**
 * `--radius-<name>: <n>px` declarations → { name: n }. Throws on any other
 * `--radius-*` value shape, so a member can never silently skip the guard.
 */
function parseCssRadii(css: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const match of css.matchAll(/--radius-(?<name>[a-z0-9-]+):\s*(?<value>[^;]+);/g)) {
    const { name, value: rawValue } = match.groups ?? {}
    if (name === undefined || rawValue === undefined) {
      continue
    }
    const value = rawValue.trim()
    if (!/^[\d.]+px$/.test(value)) {
      throw new Error(`parseCssRadii: unparseable --radius-${name} value "${value}" (expected "<n>px")`)
    }
    out[name] = Number(value.replace(/px$/, ''))
  }
  return out
}

interface CssTypographyToken {
  fontSize?: number
  lineHeight?: number
  fontWeight?: number
  letterSpacing?: string
}

/** `<n>px` or `<n>rem` (16px base) → px number. Throws on any other shape. */
function parseCssLengthPx(value: string, context: string): number {
  if (/^-?[\d.]+px$/.test(value)) {
    return Number(value.slice(0, -'px'.length))
  }
  if (/^-?[\d.]+rem$/.test(value)) {
    return Number(value.slice(0, -'rem'.length)) * 16
  }
  throw new Error(`parseCssLengthPx: unparseable ${context} value "${value}" (expected "<n>px" or "<n>rem")`)
}

/** `--text-<variant>[--<modifier>]: <value>` declarations → per-variant tokens. */
function parseCssTypography(css: string): Record<string, CssTypographyToken> {
  const out: Record<string, CssTypographyToken> = {}
  for (const match of css.matchAll(/--text-(?<key>[a-z0-9-]+):\s*(?<value>[^;]+);/g)) {
    const { key, value: rawValue } = match.groups ?? {}
    if (key === undefined || key === '' || rawValue === undefined) {
      continue
    }
    const sepIndex = key.indexOf('--')
    const variant = sepIndex === -1 ? key : key.slice(0, sepIndex)
    const modifier = sepIndex === -1 ? undefined : key.slice(sepIndex + 2)
    const value = rawValue.trim()
    const token = (out[variant] ??= {})
    if (modifier === undefined) {
      token.fontSize = parseCssLengthPx(value, `--text-${key}`)
    } else if (modifier === 'line-height') {
      token.lineHeight = parseCssLengthPx(value, `--text-${key}`)
    } else if (modifier === 'font-weight') {
      token.fontWeight = Number(value)
    } else if (modifier === 'letter-spacing') {
      token.letterSpacing = value
    } else {
      throw new Error(`parseCssTypography: unknown --text modifier "${modifier}"`)
    }
  }
  return out
}

/**
 * `--height-<name>: <n>px` declarations → { name: n }. Throws on any other
 * `--height-*` value shape, so a member can never silently skip the guard.
 */
function parseCssHeights(css: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const match of css.matchAll(/--height-(?<name>[a-z0-9-]+):\s*(?<value>[^;]+);/g)) {
    const { name, value: rawValue } = match.groups ?? {}
    if (name === undefined || rawValue === undefined) {
      continue
    }
    const value = rawValue.trim()
    if (!/^[\d.]+px$/.test(value)) {
      throw new Error(`parseCssHeights: unparseable --height-${name} value "${value}" (expected "<n>px")`)
    }
    out[name] = Number(value.replace(/px$/, ''))
  }
  return out
}

describe('@universe/tailwind TS tokens ↔ css/theme.css (derivation honesty guard)', () => {
  it('radii match the --radius-* custom properties', () => {
    expect({ ...radii }).toEqual(parseCssRadii(themeCss))
  })

  it('heights match the --height-* custom properties', () => {
    expect({ ...tailwindHeights }).toEqual(parseCssHeights(themeCss))
  })

  it('typography matches the --text-* custom properties', () => {
    const plainTypography = Object.fromEntries(
      Object.entries(typography).map(([variant, token]) => [variant, { ...token }]),
    )
    expect(plainTypography).toEqual(parseCssTypography(themeCss))
  })
})
