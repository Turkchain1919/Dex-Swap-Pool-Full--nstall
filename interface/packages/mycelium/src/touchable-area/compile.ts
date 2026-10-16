/**
 * The TouchableArea binding of the shared compat compiler: resolves the
 * wrapper + frame semantics (`./resolve`), then composes the per-style-object
 * compiler through the generic pool orchestration in `../compat/compose`.
 * The parity suite in `packages/tailwind/src/parity/touchable-area` proves
 * the output equivalent to what the real `ui/src` TouchableArea renders.
 */
import { type CompatEmission, composeCompatClassName, composeCompatEmission } from '../compat/compose'
import { arbitrary, outlineColorClasses, RESET_CLASSES } from '../compat/style-classes'
import { POINTER_EVENTS_BOX_CLASSES } from '../compat/style-props'
import { flexStyleClasses } from '../flex-compat/flex-style-classes'
import type { TouchableAreaCompatProps, TouchableAreaCompatStyleProps } from './props'
import {
  type ResolvedTouchableAreaProps,
  resolveTouchableAreaCompatProps,
  SURFACE5_HOVERED,
  TOUCHABLE_AREA_VARIANTS,
} from './resolve'
import { touchableAreaWebTransition } from './web-transition'

export type { TouchableAreaCompatProps, TouchableAreaCompatStyleProps } from './props'

/**
 * TouchableArea frame defaults reproducing what the legacy styled frame
 * contributes on web (verified against its injected atomic CSS by the parity
 * suite): the shared view reset + column layout, the always-on group
 * container declarations (`container-type: normal` — the frame's
 * `$platform-web` override, layout-inert, unlike Flex's pinned inline-size),
 * the 12px radius, transparent background, and pointer cursor. Cursor is an
 * arbitrary property so later `[cursor:*]` styles merge over it.
 */
const FRAME_CLASSES = `flex flex-col items-stretch basis-auto ${RESET_CLASSES} shrink-0 [container-type:normal] rounded-[12px] [cursor:pointer]`

/** The `<a>`-mode base additions (the legacy modifier-press wiring). */
const ANCHOR_CLASSES = '[text-decoration-line:none] [text-decoration:none] [color:inherit]'

function baseClasses(props: TouchableAreaCompatProps): string {
  const group = props.group ?? true
  const containerName = group === true ? 'true' : String(group)
  const cls = [`[container-name:${arbitrary(containerName)}]`, FRAME_CLASSES]
  // The raised variant drops the frame's transparent background (its own
  // backgroundColor is required by the legacy contract).
  if (props.variant !== 'raised') {
    cls.push('bg-transparent')
  }
  if (props.modifierPressHref !== undefined) {
    cls.push(ANCHOR_CLASSES)
  }
  return cls.join(' ')
}

/**
 * `$surface5Hovered` has no `@universe/tailwind` counterpart; both spore
 * themes pin it to the same value (see `./resolve`), so it compiles to the
 * raw color instead of failing fast like other unmapped tokens.
 */
function withSurface5Hovered(style: TouchableAreaCompatStyleProps): TouchableAreaCompatStyleProps {
  if (style.backgroundColor !== '$surface5Hovered' && style.borderColor !== '$surface5Hovered') {
    return style
  }
  const out = { ...style }
  if (out.backgroundColor === '$surface5Hovered') {
    out.backgroundColor = SURFACE5_HOVERED
  }
  if (out.borderColor === '$surface5Hovered') {
    out.borderColor = SURFACE5_HOVERED
  }
  return out
}

/**
 * The frame's focus-visible scale ring compiles as `scaleX() scaleY()` in that
 * order (the legacy styled-options static output), unlike the generic
 * descending-name transform composition — special-cased for the bare
 * scaleX+scaleY pair so the emitted declaration is byte-identical.
 */
function scaleRingTransform(style: TouchableAreaCompatStyleProps): TouchableAreaCompatStyleProps {
  const { scaleX, scaleY } = style
  if (scaleX === undefined || scaleY === undefined || style.scale !== undefined || style.transform !== undefined) {
    return style
  }
  const { scaleX: _scaleX, scaleY: _scaleY, ...rest } = style
  return { ...rest, transform: `scaleX(${scaleX}) scaleY(${scaleY})` }
}

/** Compile one TouchableArea style object (no frame classes) — the recursive unit. */
export function touchableAreaStyleClasses(style: TouchableAreaCompatStyleProps): string[] {
  const { outlineColor, WebkitBackdropFilter, ...rest } = scaleRingTransform(withSurface5Hovered(style))
  const cls = flexStyleClasses(rest as TouchableAreaCompatStyleProps)
  if (outlineColor !== undefined) {
    cls.push(...outlineColorClasses(String(outlineColor)))
  }
  if (WebkitBackdropFilter !== undefined) {
    // Alongside backdropFilter for Safari ≤17; the parity normalizer folds the
    // duplicate prefixed twin on both sides, so this is proven by emission
    // (compile tests + manifest), not by a scope diff.
    cls.push(`[-webkit-backdrop-filter:${arbitrary(WebkitBackdropFilter)}]`)
  }
  return cls
}

// In the base pool, not the frame class string, so it merges and diffs per scope
// like any other style and the native lane composes without it. An active animation
// OVERWRITES a caller `transition`, as the legacy driver does: it assigns
// `style.transition` before Tamagui extracts atomic classes.
function withWebTransition(
  props: TouchableAreaCompatProps,
  resolvedProps: ResolvedTouchableAreaProps,
): ResolvedTouchableAreaProps {
  const transition = touchableAreaWebTransition(props)
  return transition === undefined ? resolvedProps : { ...resolvedProps, transition }
}

function composeClassName(props: TouchableAreaCompatProps, resolvedProps: ResolvedTouchableAreaProps): string {
  return composeCompatClassName<TouchableAreaCompatStyleProps>({
    props: resolvedProps,
    baseClasses: baseClasses(props),
    styleClasses: touchableAreaStyleClasses,
  })
}

/**
 * Compile the full TouchableArea prop contract to a Tailwind className. Throws
 * on tokens with no `@universe/tailwind` counterpart instead of guessing.
 * Raw composition (parity harness) — the component renders through
 * `touchableAreaCompatEmission`, the deterministic-emission path.
 *
 * `resolvedProps` is an optional pre-resolved pool for a caller (the native
 * leg) that already ran `resolveTouchableAreaCompatProps` for its own
 * purposes and would otherwise redo that merge every render; omit it to
 * resolve from `props` as before.
 */
export function touchableAreaCompatClassName(
  props: TouchableAreaCompatProps,
  resolvedProps: ResolvedTouchableAreaProps = resolveTouchableAreaCompatProps(props),
): string {
  return composeClassName(props, withWebTransition(props, resolvedProps))
}

/**
 * The RN-first-class spellings of the pointerEvents box values. Full literals
 * on purpose: Tailwind's scanner registers them from this (scanned) source
 * file, which is what puts them in the compiled native stylesheet.
 */
const POINTER_EVENTS_BOX_NATIVE_CLASSES: Readonly<Record<string, string>> = {
  'box-none': '[pointer-events:box-none]',
  'box-only': '[pointer-events:box-only]',
}

/**
 * `touchableAreaCompatClassName` for the native leg. Identical except for the
 * pointerEvents box values (the disabled fold's `box-none`): uniwind resolves
 * the element half of the INFRA-3490 web polyfill pair but cannot resolve its
 * `[&>*]` child half, so the pair flattens to `pointerEvents: 'none'` on the
 * wrapper — natively that makes the WHOLE subtree untargetable, swallowing
 * child presses the legacy component allows. RN carries the box values
 * first-class, so the native className spells them directly. `box-none` also
 * makes the disabled wrapper transparent to its own hit-testing (a tap on its
 * empty area falls through to an ancestor touchable) — deliberate, matching
 * the web leg (INFRA-3490).
 *
 * `resolvedProps` — see `touchableAreaCompatClassName`; forwarded verbatim.
 */
export function touchableAreaCompatNativeClassName(
  props: TouchableAreaCompatProps,
  resolvedProps?: ResolvedTouchableAreaProps,
): string {
  // Not `touchableAreaCompatClassName`: that lane folds in the web-only transition.
  const classes = composeClassName(props, resolvedProps ?? resolveTouchableAreaCompatProps(props)).split(' ')
  for (const [value, pair] of Object.entries(POINTER_EVENTS_BOX_CLASSES)) {
    const [elementHalf, childHalf] = pair
    // The child half only ever comes from a box value (base tier only —
    // variant-prefixed box values throw in the compiler), so its presence
    // identifies the pair unambiguously.
    const childAt = childHalf === undefined ? -1 : classes.indexOf(childHalf)
    if (childAt === -1) {
      continue
    }
    const nativeClass = POINTER_EVENTS_BOX_NATIVE_CLASSES[value]
    // Check before splicing: if a future box value lands in the web map but
    // not here, fail loudly instead of silently leaving the swallowing
    // `[pointer-events:none]` in place.
    if (nativeClass === undefined) {
      throw new Error(`No native pointer-events spelling registered for box value "${value}"`)
    }
    classes.splice(childAt, 1)
    const elementAt = elementHalf === undefined ? -1 : classes.indexOf(elementHalf)
    if (elementAt !== -1) {
      classes[elementAt] = nativeClass
    }
  }
  return classes.join(' ')
}

/**
 * Every class the TouchableArea frame + resolved variant defaults compile to
 * (press scale/opacity pools, focus rings, per-variant hover/theme pools, the
 * anchor-mode chrome) — the component's contribution to the generated
 * safelist and the strict path's membership set (engine-memoized).
 */
export function touchableAreaFixedCompatClasses(): string[] {
  return TOUCHABLE_AREA_VARIANTS.flatMap((variant) => [
    touchableAreaCompatClassName({ variant }),
    touchableAreaCompatClassName({ variant, disabled: true }),
    touchableAreaCompatClassName({ variant, hoverable: false, focusable: false }),
    touchableAreaCompatClassName({ variant, modifierPressHref: '#' }),
  ])
}

/**
 * Compile the full TouchableArea prop contract for rendering (INFRA-3217):
 * every returned class is guaranteed present in the emitted stylesheet;
 * base-pool values outside the closed set come back as inline styles instead.
 */
export function touchableAreaCompatEmission(props: TouchableAreaCompatProps): CompatEmission {
  return composeCompatEmission<TouchableAreaCompatStyleProps>({
    props: withWebTransition(props, resolveTouchableAreaCompatProps(props)),
    baseClasses: baseClasses(props),
    styleClasses: touchableAreaStyleClasses,
    fixedClasses: touchableAreaFixedCompatClasses,
  })
}
