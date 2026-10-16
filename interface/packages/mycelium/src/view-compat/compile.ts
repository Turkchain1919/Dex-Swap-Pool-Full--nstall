/**
 * The View binding of the shared compat compiler: the Flex compiler minus the
 * Flex variant shorthands. Deliberately thin (INFRA-2950) — the frame
 * defaults are reused from flex-compat because the parity probe measured a
 * zero base-CSS delta between Tamagui's `View` and `Flex` on web (both emit
 * display:flex, flex-direction:column, align-items:stretch, flex-basis:auto,
 * flex-shrink:0 + the shared reset). The parity block in
 * `packages/tailwind/src/parity/view` pins the layout families; every shared
 * pool is proven by the Flex binding of the same suite.
 */
import { type CompatEmission, composeCompatClassName, composeCompatEmission } from '../compat/compose'
import { type ClassList, commonStyleClasses, flexboxStyleClasses, insetClasses } from '../compat/style-classes'
import { BASE_CLASSES, flexDisplayClass } from '../flex-compat/flex-style-classes'
import type { ViewCompatProps, ViewCompatStyleProps } from './props'

export type { ViewCompatProps, ViewCompatStyleProps } from './props'

/** Compile one View style object (no BASE_CLASSES) — the recursive unit. */
function viewStyleClasses(props: ViewCompatStyleProps): string[] {
  const cls: ClassList = [
    ...insetClasses(props.inset),
    ...flexboxStyleClasses(props, flexDisplayClass),
    ...commonStyleClasses(props),
  ]
  return cls.filter((entry): entry is string => typeof entry === 'string' && entry !== '')
}

/**
 * Compile the full View prop contract to a Tailwind className. Throws on
 * tokens with no `@universe/tailwind` counterpart instead of guessing.
 * Raw composition (parity harness) — components render through
 * `viewCompatEmission`, the deterministic-emission path.
 */
export function viewCompatClassName(props: ViewCompatProps): string {
  return composeCompatClassName<ViewCompatStyleProps>({
    props,
    baseClasses: BASE_CLASSES,
    styleClasses: viewStyleClasses,
  })
}

/** The shared Flex frame classes, membership-checked on the strict path (engine-memoized). */
function viewFixedCompatClasses(): string[] {
  return [viewCompatClassName({})]
}

/**
 * Compile the full View prop contract for rendering (INFRA-3217): every
 * returned class is guaranteed present in the emitted stylesheet; values
 * outside the closed set ride the inline-value lane instead.
 */
export function viewCompatEmission(props: ViewCompatProps): CompatEmission {
  return composeCompatEmission<ViewCompatStyleProps>({
    props,
    baseClasses: BASE_CLASSES,
    styleClasses: viewStyleClasses,
    fixedClasses: viewFixedCompatClasses,
  })
}
