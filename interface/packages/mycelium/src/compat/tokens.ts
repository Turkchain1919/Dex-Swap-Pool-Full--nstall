/**
 * Spore design-token maps for the Tamagui-compatible Flex prop API.
 * Mirrors `ui/src/theme`; `packages/tailwind/src/parity` guards against drift.
 */
// Type-only — never a runtime react-native import in a file shared by both platform legs (packages/mycelium/CLAUDE.md).
import type { OpaqueColorValue } from 'react-native'
// The leaf, not the `../tokens` barrel: the barrel's `fonts` native leg reaches
// back through here, so importing it would close an initialization cycle.
import { zIndexes } from '../token-constants'

// `native-diagnostics.ts`'s bare `__DEV__` probe, not `./dev-warning`'s env-backed one (the chrome/* closure constraint, package CLAUDE.md).
declare const __DEV__: boolean | undefined
function isDevEnvironment(): boolean {
  return typeof __DEV__ === 'boolean' ? __DEV__ : true
}

export const SPACE_TOKEN_PX = {
  $none: 0,
  $true: 8,
  $spacing1: 1,
  $spacing2: 2,
  $spacing4: 4,
  $spacing6: 6,
  $spacing8: 8,
  $spacing12: 12,
  $spacing16: 16,
  $spacing18: 18,
  $spacing20: 20,
  $spacing24: 24,
  $spacing28: 28,
  $spacing32: 32,
  $spacing36: 36,
  $spacing40: 40,
  $spacing48: 48,
  $spacing60: 60,
  $padding6: 6,
  $padding8: 8,
  $padding12: 12,
  $padding16: 16,
  $padding20: 20,
  $padding24: 24,
  $padding36: 36,
  $gap2: 2,
  $gap4: 4,
  $gap8: 8,
  $gap12: 12,
  $gap16: 16,
  $gap20: 20,
  $gap24: 24,
  $gap32: 32,
  $gap36: 36,
} as const

/**
 * Icon size tokens → px. Mirrors the `iconSize` token map in
 * `ui/src/theme/tokens.ts` (the legacy icon factory's `IconSizeTokens`
 * surface): identity except `$icon.true`, the legacy default alias.
 */
export const ICON_SIZE_TOKEN_PX = {
  '$icon.true': 40,
  '$icon.8': 8,
  '$icon.12': 12,
  '$icon.14': 14,
  '$icon.16': 16,
  '$icon.18': 18,
  '$icon.20': 20,
  '$icon.24': 24,
  '$icon.28': 28,
  '$icon.32': 32,
  '$icon.36': 36,
  '$icon.40': 40,
  '$icon.48': 48,
  '$icon.64': 64,
  '$icon.70': 70,
  '$icon.100': 100,
} as const

export const RADIUS_TOKEN_PX = {
  $none: 0,
  /** Legacy `radius.true` alias (`ui/src/theme/tokens.ts` — `true: borderRadii.none`). */
  $true: 0,
  $rounded4: 4,
  $rounded6: 6,
  $rounded8: 8,
  $rounded12: 12,
  $rounded16: 16,
  $rounded20: 20,
  $rounded24: 24,
  $rounded32: 32,
  $roundedFull: 999999,
} as const

/**
 * Spore color token → Tailwind semantic color utility suffix
 * (tokens come from `@universe/tailwind`'s web theme).
 *
 * Every suffix is an auto-switching utility: `variables.css` (web) and
 * `native.css` (uniwind) both declare `--<suffix>` per theme, so one class
 * flips with the theme on both platforms — no `dark:` sibling needed. The
 * theme-reactive entries were verified value-identical to `ui/src`'s resolved
 * legacy values in both themes before being added; the coverage boundary
 * held supported ∪ rejected = the legacy theme, exactly, verified against
 * `ui/src`'s full token set for the life of the migration.
 */
export const COLOR_TOKEN_CLASS = {
  $white: 'white',
  $black: 'black',
  $transparent: 'transparent',
  $scrim: 'scrim',
  $neutral1: 'neutral1',
  $neutral1Hovered: 'neutral1-hovered',
  $neutral2: 'neutral2',
  $neutral2Hovered: 'neutral2-hovered',
  $neutral3: 'neutral3',
  $neutral3Hovered: 'neutral3-hovered',
  $surface1: 'surface1',
  $surface2: 'surface2',
  $surface3: 'surface3',
  $surface3Solid: 'surface3-solid',
  $surface4: 'surface4',
  $surface5: 'surface5',
  $surface5Hovered: 'surface5-hovered',
  $accent1: 'accent1',
  $accent1Hovered: 'accent1-hovered',
  $accent2: 'accent2',
  $accent2Hovered: 'accent2-hovered',
  $accent2Solid: 'accent2-solid',
  $poolsBrandGreen: 'pools-brand-green',
  $statusSuccess: 'success',
  $statusSuccessHovered: 'success-hovered',
  $statusSuccess2: 'success-secondary',
  $statusCritical: 'critical',
  $statusCriticalHovered: 'critical-hovered',
  $statusCritical2: 'critical-secondary',
  $statusWarning: 'warning',
  $statusWarningHovered: 'warning-hovered',
  $statusWarning2: 'warning-secondary',
  // Theme-reactive shadow colours: no palette `--color-*-light/dark` pair in
  // theme.css, so `variables.css`/`native.css` declare the per-theme values as
  // literals (the `--shadow-short|medium|large` pattern), lockstep-pinned by
  // the native-bundle parity suite. Deliberately NOT `--shadow-*` inside any
  // `@theme` block — that namespace mints box-shadow utilities in Tailwind v4.
  $shadowColor: 'shadow-color',
  $shadowColorHover: 'shadow-color-hover',
  // Tamagui component aliases: `ui/src/theme/themes.ts` defines these FROM the
  // palette entries they point at (`background: colorsLight.surface1`,
  // `color: colorsLight.neutral1`), so routing them to the same utilities is
  // exact by construction, not a near-match.
  $background: 'surface1',
  $color: 'neutral1',
} as const

/**
 * Theme-invariant color tokens resolve to literals in the icon factory:
 * their raw `--color-*` palette vars are tree-shaken from compiled app CSS
 * (Tailwind's scanner cannot see React-rendered attributes — the Caret
 * dark-mode lesson), and the literals match the legacy resolved values in
 * both themes. Keyed by `COLOR_TOKEN_CLASS` suffixes — the type ties every
 * key to that map's value union, so a suffix rename there fails typecheck
 * here instead of silently falling back to a tree-shaken palette var.
 *
 * Membership doubles as the "mode-independent" set for the outline and shadow
 * lanes in `style-classes.ts`: these suffixes have a `--color-<suffix>` in
 * `css/theme.css` but no per-theme `--<suffix>` alias, so those lanes read
 * `var(--color-<suffix>)` instead of the auto-switching var.
 */
export const LITERAL_SEMANTIC_COLORS: Partial<
  Record<(typeof COLOR_TOKEN_CLASS)[keyof typeof COLOR_TOKEN_CLASS], string>
> = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  scrim: 'rgba(0, 0, 0, 0.6)',
}

/**
 * Interaction-state color tokens. The `light` suffix doubles as an
 * auto-switching variable name: `variables.css` emits `--<light>` under both
 * `:root` and `.dark` (INFRA-2353 spore token refresh), so `colorClasses`
 * compiles a light utility plus a `dark:` override while icons resolve
 * `var(--<light>)` directly. The icon parity matrix derives from this map
 * and pins both themes — an entry whose variable doesn't switch fails it.
 */
export const THEMED_COLOR_TOKEN_CLASSES = {
  $surface1Hovered: { light: 'surface1-hovered', dark: 'surface1-hovered-dark' },
  $surface2Hovered: { light: 'surface2-hovered', dark: 'surface2-hovered-dark' },
  $surface3Hovered: { light: 'surface3-hovered', dark: 'surface3-hovered-dark' },
} as const

/**
 * Raw Spore palette colours (`ui/src/theme/color/colors.ts` `colors`): the
 * brand palette `useSporeColors()` exposes but the semantic theme
 * (`themes.light`) never spreads, so they sit OUTSIDE the compat colour
 * boundary's universe (supported ∪ rejected = the theme, and these are in
 * neither). Resolved to literals for the same
 * reason as `LITERAL_SEMANTIC_COLORS`: palette colours are theme-invariant
 * (one value, no light/dark twin) and their `--color-*` vars are tree-shaken
 * from compiled app CSS (Tailwind's scanner can't see React-rendered
 * attributes), so a `var()` would resolve to nothing on a rendered icon.
 * Keyed by the `$`-prefixed spelling a legacy call site uses; values were
 * drift-pinned against `ui/src`'s palette for the life of the migration.
 */
export const PALETTE_COLOR_LITERAL = {
  // `$white`/`$black`/`$scrim` overlap `LITERAL_SEMANTIC_COLORS`, which
  // `iconColorTokenValue` consults first, so these three are inert here at
  // runtime — kept only to keep this map a 1:1 mirror of `ui/src` `colors`
  // for the drift test.
  $white: '#FFFFFF',
  $black: '#000000',
  $scrim: 'rgba(0,0,0,0.60)',
  $pinkLight: '#FEF4FF',
  $pinkPastel: '#FDAFF0',
  $pinkBase: '#FC74FE',
  $pinkVibrant: '#F50DB4',
  $pinkDark: '#361A37',
  $redLight: '#FFF2F1',
  $redPastel: '#FDCFC4',
  $redBase: '#FF5F52',
  $redVibrant: '#FF0000',
  $redDark: '#220D0C',
  $orangeLight: '#FEF5EA',
  $orangePastel: '#FFE8BC',
  $orangeBase: '#FF8934',
  $orangeVibrant: '#FF4D00',
  $orangeDark: '#371B0C',
  $yellowLight: '#FFFE8B',
  $yellowPastel: '#FFF8B4',
  $yellowBase: '#FFBF17',
  $yellowVibrant: '#FFF612',
  $yellowDark: '#1F1E02',
  $brownLight: '#F7F6F1',
  $brownPastel: '#E2E0CD',
  $brownBase: '#85754A',
  $brownVibrant: '#996F01',
  $brownDark: '#231E0F',
  $greenLight: '#EEFBF1',
  $greenPastel: '#C2E7D0',
  $greenBase: '#0C8911',
  $greenVibrant: '#21C95E',
  $greenDark: '#0F2C1A',
  $limeLight: '#F7FEEB',
  $limePastel: '#E4F6C4',
  $limeBase: '#78E744',
  $limeVibrant: '#B1F13C',
  $limeDark: '#232917',
  $turquoiseLight: '#F7FEEB',
  $turquoisePastel: '#CAFFDF',
  $turquoiseBase: '#00C3A0',
  $turquoiseVibrant: '#5CFE9D',
  $turquoiseDark: '#1A2A21',
  $cyanLight: '#EBF8FF',
  $cyanPastel: '#B9E3F8',
  $cyanBase: '#23A3FF',
  $cyanVibrant: '#3ADCFF',
  $cyanDark: '#15242B',
  $blueLight: '#EFF4FF',
  $bluePastel: '#D0D9F8',
  $blueBase: '#4981FF',
  $blueVibrant: '#0047FF',
  $blueDark: '#10143D',
  $purpleLight: '#FAF5FF',
  $purplePastel: '#E9D8FD',
  $purpleBase: '#9E62FF',
  $purpleVibrant: '#4300B0',
  $purpleDark: '#1A0040',
  $uniswapXViolet: '#4673FA',
  $uniswapXPurple: '#7D55FB',
  $fiatOnRampBanner: '#FB36D0',
} as const

/**
 * Resolve a `$`-color token to the CSS value the icon SVG channels inline:
 * semantic → literal (theme-invariant trio) or auto-switching `--<semantic>`
 * var; themed interaction-state → auto-switching `--<name>-hovered` var; raw
 * Spore palette (`$blueBase`) → theme-invariant literal. `undefined` means the
 * token is outside every map — the caller throws (never resolves raw). Lives
 * beside its tables (icon-props.ts is at the max-lines cap).
 */
export function iconColorTokenValue(value: string): string | undefined {
  const semantic = lookupToken(COLOR_TOKEN_CLASS, value)
  if (semantic !== undefined) {
    return LITERAL_SEMANTIC_COLORS[semantic] ?? `var(--${semantic})`
  }
  const themed = lookupToken(THEMED_COLOR_TOKEN_CLASSES, value)
  if (themed !== undefined) {
    return `var(--${themed.light})`
  }
  return lookupToken(PALETTE_COLOR_LITERAL, value)
}

/**
 * Spore z-index token → layer number. Mirrors the legacy `zIndex` token map
 * (`ui/src/theme/tokens.ts` — `{ ...zIndexes, true: zIndexes.default }`),
 * derived from mycelium's own `zIndexes` rather than re-literalled, so the
 * `tokens.parity.test.ts` drift guard covers it too.
 */
export const Z_INDEX_TOKEN = {
  $negative: zIndexes.negative,
  $background: zIndexes.background,
  $default: zIndexes.default,
  $mask: zIndexes.mask,
  $dropdown: zIndexes.dropdown,
  $header: zIndexes.header,
  $sidebar: zIndexes.sidebar,
  $sticky: zIndexes.sticky,
  $fixed: zIndexes.fixed,
  $modalBackdrop: zIndexes.modalBackdrop,
  $offcanvas: zIndexes.offcanvas,
  $modal: zIndexes.modal,
  $popoverBackdrop: zIndexes.popoverBackdrop,
  $popover: zIndexes.popover,
  $tooltip: zIndexes.tooltip,
  $overlay: zIndexes.overlay,
  $toast: zIndexes.toast,
  $true: zIndexes.default,
} as const

export type SporeSpaceToken = keyof typeof SPACE_TOKEN_PX
export type SporeIconSizeToken = keyof typeof ICON_SIZE_TOKEN_PX
export type SporeRadiusToken = keyof typeof RADIUS_TOKEN_PX
export type SporeZIndexToken = keyof typeof Z_INDEX_TOKEN
export type SporeColorToken = keyof typeof COLOR_TOKEN_CLASS | keyof typeof THEMED_COLOR_TOKEN_CLASSES

/**
 * Tamagui's runtime `Variable` object, typed structurally — mycelium takes no
 * Tamagui dependency. Legacy admits it in every token position and resolves it
 * through `getVariableValue` (its `val`); the compat lanes unwrap the same way
 * (INFRA-3258).
 */
export interface TamaguiVariable {
  isVar: true
  val: string | number
  name: string
  key: string
  variable?: string
}

export function isTamaguiVariable(value: unknown): value is TamaguiVariable {
  return typeof value === 'object' && value !== null && (value as { isVar?: unknown }).isVar === true
}

/** Legacy `getVariableValue`: a `Variable` resolves to its `val`; anything else is already a value. */
export function unwrapVariable(value: string | number | TamaguiVariable): string | number {
  return isTamaguiVariable(value) ? value.val : value
}

/**
 * Color-specific twin of `unwrapVariable` for RN inline-style builders
 * (`native-style.ts` and friends): RN's own style types already accept
 * `PlatformColor()`/`DynamicColor()` natively, so an `OpaqueColorValue`
 * (INFRA-3804) passes through unchanged here — unlike the class/CSS lanes
 * (`resolveColorOrWarn` below), which have no such passthrough and drop.
 */
export function unwrapVariableForNativeStyle(
  value: string | TamaguiVariable | OpaqueColorValue,
): string | OpaqueColorValue {
  return isTamaguiVariable(value) ? String(value.val) : value
}

let warnedOpaqueColorValue = false

/**
 * Resolves a color-family value to its string leg, or signals "drop" for a
 * legacy `OpaqueColorValue` (admitted onto `ColorValue` for structural compat,
 * INFRA-3804) — no real call site passes one today. The class/CSS compile
 * lanes call this instead of `unwrapVariable` so an opaque value warns once in
 * dev and drops, rather than compiling `String(value)`'s `"[object Object]"`.
 */
export function resolveColorOrWarn(value: string | TamaguiVariable | OpaqueColorValue): string | undefined {
  if (isTamaguiVariable(value)) {
    return String(value.val)
  }
  if (typeof value === 'string') {
    return value
  }
  if (isDevEnvironment() && !warnedOpaqueColorValue) {
    warnedOpaqueColorValue = true
    // oxlint-disable-next-line no-console -- dev-only diagnostic; the compat drop path below is otherwise silent
    console.warn(
      'compat: received an OpaqueColorValue (PlatformColor()/DynamicColor()) where a compat color prop expects a Spore token or a raw CSS color string. No compat renderer resolves OS-level dynamic colors — dropping the color declaration instead of emitting garbage.',
    )
  }
  return undefined
}

/**
 * Token maps are closed const objects, so `keyof`-indexed lookups never type
 * as undefined — but at runtime props can carry arbitrary strings. Widens the
 * lookup so a miss is reachable in the type system too.
 */
export function lookupToken<V>(map: Readonly<Record<string, V>>, key: string): V | undefined {
  return Object.hasOwn(map, key) ? map[key] : undefined
}

/** Arbitrary values can't contain spaces — Tailwind's syntax uses `_` instead. */
export function arbitrary(value: string): string {
  return value.replace(/\s+/g, '_')
}

/**
 * `[outline-color:…]` counterpart of the semantic color model (TouchableArea
 * focus rings). Token resolution is `colorTokenCssValue` — one source of truth
 * with the long-tail color lane — EXCEPT the themed hovered tokens, the one
 * deliberate shape divergence: this lane predates the auto-switching collapse
 * and ships an explicit light+dark palette-var pair, enumerated per token in
 * the generated safelist (`closed-set.ts`). The split is pinned by the
 * outline-lane parity tests in `style-classes.test.ts`; collapsing the pair to
 * the single `--<light>` alias is a safelist regeneration + pin update away.
 */
export function outlineColorClasses(value: string): string[] {
  const themed = lookupToken(THEMED_COLOR_TOKEN_CLASSES, value)
  if (themed !== undefined) {
    return [`[outline-color:var(--color-${themed.light})]`, `dark:[outline-color:var(--color-${themed.dark})]`]
  }
  if (value.startsWith('$')) {
    return [`[outline-color:${colorTokenCssValue(value, 'outlineColor')}]`]
  }
  return [`[outline-color:${arbitrary(value)}]`]
}

/**
 * The long-tail color props (`COLOR_LONG_TAIL_PROPS`) are Tamagui color-category
 * keys, same as the `borderColor` shorthand: resolve a `$` token to the CSS
 * var expression its arbitrary-property class reads, or throw with the color
 * boundary's posture (rejected/unknown tokens are a compile error, never a
 * guess — see `color-token-coverage.ts`).
 *
 * One class per value, no `dark:` sibling: plain semantic suffixes ride their
 * auto-switching `--suffix` var; the themed hovered tokens ride their LIGHT
 * suffix, which `variables.css` also declares under both `:root` and `.dark`
 * (the same collapse the var-indirection twin tables apply — see
 * `twin-tables.ts` `buildThemedTables`); the theme-invariant trio has no
 * per-theme alias and reads its pinned palette var directly.
 * Lives beside its tables (style-classes.ts is at the max-lines cap).
 */
export function colorTokenCssValue(value: string, prop: string): string {
  const semantic = lookupToken(COLOR_TOKEN_CLASS, value)
  if (semantic !== undefined) {
    return Object.hasOwn(LITERAL_SEMANTIC_COLORS, semantic) ? `var(--color-${semantic})` : `var(--${semantic})`
  }
  const themed = lookupToken(THEMED_COLOR_TOKEN_CLASSES, value)
  if (themed !== undefined) {
    return `var(--${themed.light})`
  }
  throw new Error(`compat: color token "${value}" for "${prop}" has no @universe/tailwind counterpart`)
}

/**
 * Shadow color resolution shared by both failure policies: CSS expression
 * (var for semantic tokens, raw otherwise), `undefined` for a `$` token
 * outside the maps. Same mode-independent set as `outlineColorClasses` —
 * palette var, no alias — and deliberately no themed-hovered lane, matching
 * the web compiler's historic shadow surface. The web lane in
 * `style-classes.ts` throws on `undefined`; the native className lane
 * (`flex-compat/compile.ts`) drops the box-shadow declaration instead — a
 * render of always-mounted chrome must not crash over a missing shadow.
 * Lives beside its tables (style-classes.ts is at the max-lines cap).
 */
export function shadowColorExpressionOrUndefined(
  value: string | TamaguiVariable | OpaqueColorValue,
): string | undefined {
  // Always a CSS var()-reference class string on both legs, unlike backgroundColor/borderColor's native passthrough.
  const resolved = resolveColorOrWarn(value)
  if (resolved === undefined) {
    return undefined
  }
  const semantic = lookupToken(COLOR_TOKEN_CLASS, resolved)
  if (semantic !== undefined) {
    return Object.hasOwn(LITERAL_SEMANTIC_COLORS, semantic) ? `var(--color-${semantic})` : `var(--${semantic})`
  }
  if (resolved.startsWith('$')) {
    return undefined
  }
  return resolved
}

/**
 * `borderRadius` and the per-corner radius props are Tamagui `RadiusKeys`:
 * number → px, `$token` → px off `RADIUS_TOKEN_PX`, unknown token →
 * `undefined`. The lenient lane for the native compiler, which drops-and-reports
 * unknown tokens instead of throwing.
 */
export function radiusPxOrUndefined(value: string | number): number | undefined {
  return typeof value === 'number' ? value : lookupToken(RADIUS_TOKEN_PX, value)
}

/**
 * Throwing lane of `radiusPxOrUndefined` for the web compiler: unknown token →
 * throw. `label` names the offending prop — with 12 per-corner props routed
 * here, the message must say which one rejected the token (same contract as
 * `spaceTokenPx` in style-classes.ts). Lives beside its table
 * (style-classes.ts is at the max-lines cap).
 */
export function radiusPx(value: string | number, label = 'radius'): number {
  const px = radiusPxOrUndefined(value)
  if (px === undefined) {
    throw new Error(`compat: unknown ${label} token "${String(value)}"`)
  }
  return px
}
