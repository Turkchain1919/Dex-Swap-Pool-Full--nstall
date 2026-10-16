import type { Ref } from 'react'
// Type-only — react-native runtime imports are banned outside .native legs.
import type { View } from 'react-native'

/**
 * The web element type the compat primitives forward through their refs
 * (`createCompatComponent` in ./dom is `forwardRef<HTMLElement, …>`, and the
 * TouchableArea/Text web legs match). Drop-in for the web half of the legacy
 * `TamaguiElement` (`HTMLElement | View`): consumers typing refs/state that
 * point at `Flex`/`View` containers annotate with this alias instead of
 * reaching back into `ui/src`.
 *
 * Web-only by design — mycelium native legs forward React Native `View` refs,
 * which this alias deliberately excludes.
 */
export type MyceliumElement = HTMLElement

/**
 * The ref PROP the platform-split compat primitives accept (Flex and the
 * animated wrappers): tsc resolves only base legs, so both web and native
 * call sites typecheck against one shape — native legs forward a real RN
 * `View`, so View refs must be admitted alongside the HTMLElement refs.
 *
 * A union of ref types, deliberately not `Ref<HTMLElement | View>`:
 * `RefCallback` is contravariant, so a ref of the widened union would reject
 * the narrow web callbacks real call sites pass (e.g. a
 * `useState<HTMLElement | null>` setter). Each arm admits its own family —
 * web element refs, native `View` refs, and legacy-`TamaguiElement`-shaped
 * union refs. Type-level only; runtime forwarding is each leg's own.
 */
export type CompatRefProp = Ref<HTMLElement> | Ref<View> | Ref<HTMLElement | View>

/**
 * Narrows an element (typically a {@link MyceliumElement} ref) to
 * `HTMLDivElement` before handing it to DOM APIs or charting libs. Mirrors the
 * legacy `assertWebElement` from `ui/src` — same runtime check, same error.
 */
export function assertWebElement(element: unknown): asserts element is HTMLDivElement {
  if (!(element instanceof HTMLDivElement)) {
    throw new Error('Element is not an HTMLDivElement')
  }
}
