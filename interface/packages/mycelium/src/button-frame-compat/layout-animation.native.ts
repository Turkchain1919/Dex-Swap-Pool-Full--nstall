/**
 * The legacy `useButtonAnimationOnChange` loading transition, shared by the
 * Button-tier native legs (ButtonCompat, IconButtonCompat). Reimplemented
 * against `react-native` — importing `ui/src/animations` would make mycelium
 * depend on `packages/ui`.
 */
import { useRef } from 'react'
import { LayoutAnimation, Platform, UIManager } from 'react-native'

/** ui/src/animations/layout/constants.ts DEFAULT_LAYOUT_ANIMATION_DURATION. */
const LAYOUT_ANIMATION_DURATION = 300

// Required for Android LayoutAnimation, at least as of RN 0.76.x
// (https://reactnative.dev/docs/animations#layoutanimation-api).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

/**
 * Configures the ease-in-ease-out LayoutAnimation in the RENDER body (not an
 * effect) when the loading value changes, so the animation is set up before
 * React commits the new tree — exactly as the legacy hook does.
 */
export function useLayoutAnimationOnLoadingChange(loading: boolean | undefined, enabled: boolean): void {
  // configureNext is GLOBAL — a spurious fire animates every in-flight layout,
  // not just this button. Two guards, deliberately separate:
  //  - the tracked value normalizes the tri-state prop, so undefined→false
  //    (both "not loading") never reads as a change;
  //  - `enabled` gates only the FIRE, never the tracked value. Folding it in
  //    would both stop tracking `loading` while opted out and make an opt-out
  //    flip read as a loading change on its own.
  const value = Boolean(loading)
  const previous = useRef(value)
  if (previous.current !== value) {
    previous.current = value
    if (enabled) {
      LayoutAnimation.configureNext({
        ...LayoutAnimation.Presets.easeInEaseOut,
        duration: LAYOUT_ANIMATION_DURATION,
      })
    }
  }
}
