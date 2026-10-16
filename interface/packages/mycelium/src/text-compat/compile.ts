/**
 * The Text binding of the shared compat compiler: computes the element's
 * global font context, then composes the Text per-style-object compiler
 * (`style-classes.ts`) through the generic pool orchestration in
 * `../compat/compose`. The workbench harness
 * (`labs/workbench/scripts/verify-text-parity.mts`) proves the output
 * equivalent to what Tamagui emits for the same props.
 */
import { type CompatEmission, composeCompatClassName, composeCompatEmission } from '../compat/compose'
import { MEDIA_VARIANT } from '../compat/media'
import type { MediaPropKey } from '../compat/props'
import type { TextCompatProps, TextCompatStyleProps } from './props'
import { BASE_CLASSES, effectiveFontToken, styleClasses } from './style-classes'

export type { TextCompatProps, TextCompatStyleProps } from './props'

/**
 * The one font context every `$`-relative fontSize/lineHeight token on the
 * element resolves against, replicating Tamagui's web behavior (verified by
 * the parity harness): the LAST fontFamily-setting pool wins — base first,
 * then $platform-web, then the media pools in declaration order — regardless
 * of whether its media query is active. A `$md={{ variant: 'body3' }}` on a
 * heading therefore re-keys even the base variant's tokens to the body font,
 * exactly like the legacy Text renders it.
 *
 * Exported for the native leg's style lane (INFRA-3229): the metrics it resolves
 * must use the SAME font context the className lane does, or the two lanes
 * disagree on a `$md={{ variant: … }}`-re-keyed element.
 */
export function globalFontToken(props: TextCompatProps): string {
  let font = effectiveFontToken(props)
  const platformWeb = props['$platform-web']
  if (platformWeb !== undefined) {
    font = effectiveFontToken(platformWeb, font)
  }
  for (const mediaKey of Object.keys(MEDIA_VARIANT) as MediaPropKey[]) {
    const mediaStyle = props[mediaKey]
    if (mediaStyle !== undefined) {
      font = effectiveFontToken(mediaStyle, font)
    }
  }
  return font
}

/**
 * Compile the full Text prop contract to a Tailwind className. Throws on
 * tokens with no pinned spore counterpart instead of guessing.
 * Raw composition (parity harness + internal fixed frames) — components
 * render through `textCompatEmission`, the deterministic-emission path.
 */
export function textCompatClassName(props: TextCompatProps): string {
  const font = globalFontToken(props)
  return composeCompatClassName<TextCompatStyleProps>({
    props,
    baseClasses: BASE_CLASSES,
    styleClasses: (style) => styleClasses(style, font),
  })
}

/**
 * Compile the full Text prop contract for rendering (INFRA-3217): every
 * returned class is guaranteed present in the emitted stylesheet; values
 * outside the closed set ride the inline-value lane instead.
 */
export function textCompatEmission(props: TextCompatProps): CompatEmission {
  return textCompatEmissionWithFixed(props, textFixedCompatClasses)
}

/**
 * The Text emission with a caller-owned fixed-class provider — for compat
 * components whose Text sub-elements have their own fixed chrome (e.g. the
 * dropdown menu item label). The provider must be a stable module-level
 * function (the engine memoizes per provider identity).
 */
export function textCompatEmissionWithFixed(
  props: TextCompatProps,
  fixedClasses: () => Iterable<string>,
): CompatEmission {
  const font = globalFontToken(props)
  return composeCompatEmission<TextCompatStyleProps>({
    props,
    baseClasses: BASE_CLASSES,
    styleClasses: (style) => styleClasses(style, font),
    fixedClasses,
  })
}

/**
 * The loading-placeholder overlay classes `TextCompat` renders (the legacy
 * `TextPlaceholder` bar). Defined here — next to the class computation — so
 * the closed-set generator picks them up; the component imports them back.
 */
export const TEXT_PLACEHOLDER_OVERLAY_CLASSES =
  'absolute top-[5%] right-[0px] bottom-[5%] left-[0px] rounded-[999999px] [background-color:var(--stext-surface3)]'

/** The Text fixed classes contributed to the generated safelist (frame + placeholder chrome). */
export function textFixedCompatClasses(): string[] {
  return [
    ...textCompatClassName({}).split(' '),
    ...TEXT_PLACEHOLDER_OVERLAY_CLASSES.split(' '),
    'flex-row',
    'items-center',
  ].filter(Boolean)
}
