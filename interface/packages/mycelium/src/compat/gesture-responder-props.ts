/**
 * RN's low-level gesture-responder negotiation family (INFRA-3751, the
 * mobile GenericImportForm.tsx container — gating whether it claims touches
 * while a sibling TextInput has focus). Split out of `props.ts` purely for
 * the oxlint `max-lines` cap (the same pressure that extracted
 * `style-props.ts`). `CompatInertProps` extends this, so every compat
 * component keeps the surface: forwarded verbatim on native
 * (`compat/native-props.ts`), inert on web like the rest of that block —
 * Tamagui's own web output has no DOM mapping for these either.
 *
 * Distinct from the INTERNAL press-responder wiring
 * `compat/native-pressability.ts` installs from `onPress`/`onPressIn`/…: that
 * wiring wins when live (it is applied after these on the native host), so a
 * call site combining both a press prop and a raw responder prop has the
 * press wiring take priority.
 */
// Type-only — react-native runtime imports are banned outside .native legs.
import type { GestureResponderEvent } from 'react-native'

export interface CompatGestureResponderProps {
  onStartShouldSetResponder?(this: void, event: GestureResponderEvent): boolean
  onStartShouldSetResponderCapture?(this: void, event: GestureResponderEvent): boolean
  onMoveShouldSetResponder?(this: void, event: GestureResponderEvent): boolean
  onMoveShouldSetResponderCapture?(this: void, event: GestureResponderEvent): boolean
  onResponderEnd?(this: void, event: GestureResponderEvent): void
  onResponderGrant?(this: void, event: GestureResponderEvent): void
  onResponderMove?(this: void, event: GestureResponderEvent): void
  onResponderReject?(this: void, event: GestureResponderEvent): void
  onResponderRelease?(this: void, event: GestureResponderEvent): void
  onResponderStart?(this: void, event: GestureResponderEvent): void
  onResponderTerminate?(this: void, event: GestureResponderEvent): void
  onResponderTerminationRequest?(this: void, event: GestureResponderEvent): boolean
}

/** Every key `CompatGestureResponderProps` declares, for the native forwarding allow-list (`native-props.ts`). */
export const GESTURE_RESPONDER_PROP_KEYS = [
  'onStartShouldSetResponder',
  'onStartShouldSetResponderCapture',
  'onMoveShouldSetResponder',
  'onMoveShouldSetResponderCapture',
  'onResponderEnd',
  'onResponderGrant',
  'onResponderMove',
  'onResponderReject',
  'onResponderRelease',
  'onResponderStart',
  'onResponderTerminate',
  'onResponderTerminationRequest',
] as const satisfies readonly (keyof CompatGestureResponderProps)[]
