/**
 * The Flex binding of the shared compat compiler: composes the Flex frame
 * defaults and the Flex per-style-object compiler through the generic pool
 * orchestration in `../compat/compose`. The parity suite in
 * `packages/tailwind/src/parity` proves the output equivalent to Tamagui's.
 */
import { collectCompatClassNames } from '../compat/closed-set-runtime'
import { type CompatEmission, composeCompatClassName, composeCompatEmission } from '../compat/compose'
import { warnDroppedNativeShadowColorToken } from '../compat/native-diagnostics'
import type { ColorValue } from '../compat/props'
import { shadowColorExpressionOrUndefined, unwrapVariableForNativeStyle } from '../compat/tokens'
import { BASE_CLASSES, flexStyleClasses } from './flex-style-classes'
import type { FlexCompatProps, FlexCompatStyleProps } from './props'

export type { FlexCompatProps, FlexCompatStyleProps } from './props'

/**
 * Compile the full Flex prop contract to a Tailwind className. Throws on
 * tokens with no `@universe/tailwind` counterpart instead of guessing.
 * Raw composition (parity harness + internal fixed frames) — components
 * render through `flexCompatEmission`, the deterministic-emission path.
 */
export function flexCompatClassName(props: FlexCompatProps): string {
  return composeCompatClassName<FlexCompatStyleProps>({
    props,
    baseClasses: BASE_CLASSES,
    styleClasses: flexStyleClasses,
  })
}

/**
 * The native lane's shadow color policy: resolve through the same maps as the
 * web lane, but DROP the box-shadow declaration for a `$` token outside them
 * (one-time dev warning) instead of throwing. The native leg compiles this
 * className while rendering always-mounted chrome (tab bars, headers), where
 * an unmapped legacy token must degrade to a missing shadow, not a startup
 * crash — the same visible-drop doctrine as the RN style lane
 * (`native-style.ts` `applyShadows`, which already drops every token-valued
 * `shadowColor`). On native the composed `[box-shadow:…]` class is invisible
 * to uniwind's build-time scanner anyway, so the throw was pure crash surface.
 */
function nativeShadowColorExpression(value: ColorValue): string | undefined {
  const resolved = shadowColorExpressionOrUndefined(value)
  if (resolved === undefined) {
    warnDroppedNativeShadowColorToken(String(unwrapVariableForNativeStyle(value)))
  }
  return resolved
}

/**
 * The native lane's compiler options, shared by every native entry point so a
 * new divergence applies to all of them by construction: the
 * drop-instead-of-throw shadow color policy and RN `flex: 1` fill semantics.
 */
export const NATIVE_FLEX_LANE_OPTIONS = {
  shadowColorExpression: nativeShadowColorExpression,
  fillBasisZero: true,
} as const

/** Per-style-object compiler for the native lane: `flexStyleClasses` under `NATIVE_FLEX_LANE_OPTIONS`. */
function nativeFlexStyleClasses(style: FlexCompatStyleProps): string[] {
  return flexStyleClasses(style, NATIVE_FLEX_LANE_OPTIONS)
}

/**
 * `flexCompatClassName` for the NATIVE leg: byte-identical output on every
 * lane except shadow colors, where a token outside the compat maps drops the
 * box-shadow declaration (dev-warned) instead of throwing (see
 * `nativeShadowColorExpression`), and `fill`, which adds `basis-[0%]` to match
 * RN `flex: 1` semantics (see `variantClasses`).
 */
export function nativeFlexCompatClassName(props: FlexCompatProps): string {
  return composeCompatClassName<FlexCompatStyleProps>({
    props,
    baseClasses: BASE_CLASSES,
    styleClasses: nativeFlexStyleClasses,
  })
}

/** The frame defaults' own class set, contributed to the generated safelist (engine-memoized). */
export function flexFixedCompatClasses(): string[] {
  return collectCompatClassNames([flexCompatClassName({})])
}

/**
 * Compile the full Flex prop contract for rendering (INFRA-3217): every
 * returned class is guaranteed present in the emitted stylesheet; values
 * outside the closed set ride the inline-value lane instead.
 */
export function flexCompatEmission(props: FlexCompatProps): CompatEmission {
  return composeCompatEmission<FlexCompatStyleProps>({
    props,
    baseClasses: BASE_CLASSES,
    styleClasses: flexStyleClasses,
    fixedClasses: flexFixedCompatClasses,
  })
}

/**
 * `flexCompatEmission` WITHOUT the Flex frame defaults: only classes derived
 * from caller-specified props. For overlay `asChild` clone paths, where the
 * injected string lands in the child's incoming `className` and merges AFTER
 * the child's own compilation — frame defaults here would invert precedence
 * (a default `flex-col` silently beating the child's explicit `flex-row`).
 */
export function flexCompatOverridesEmission(props: FlexCompatProps): CompatEmission {
  return composeCompatEmission<FlexCompatStyleProps>({
    props,
    baseClasses: '',
    styleClasses: flexStyleClasses,
    fixedClasses: flexFixedCompatClasses,
  })
}
