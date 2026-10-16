import { useRef } from 'react'
import type {
  UseContextMenuPressGateParams,
  UseContextMenuPressGateResult,
} from 'uniswap/src/components/menus/hooks/useContextMenuPressGate'
import { useEvent } from 'utilities/src/react/hooks'

// Matches the thresholds that actually open a menu: iOS UIContextMenuInteraction and Android's
// long-press timeout are both ~500ms, as is RN's `delayLongPress`. A lower value would swallow
// taps that were lifted before any menu appeared.
const DEFAULT_LONG_PRESS_DURATION_MS = 500

// A press-in arriving this long after the stored one belongs to a new contact rather than to a
// mid-gesture reset, so the stored timestamp is discarded as stale.
const MAX_CONTACT_AGE_MS = 1000

/**
 * Prevents child `onPress` from firing after a long-press opens the native context menu.
 *
 * Native TouchableArea uses RNGH Pressable; UIContextMenuInteraction often wins before
 * RNGH's long-press, so `onLongPress={noop}` never runs. Re-renders can also reset
 * Pressable's timer mid-gesture. We record wall-clock time on the first `onPressIn` and
 * ignore later re-fires so elapsed time still reflects the real finger-down.
 */
export function useContextMenuPressGate({
  duration = DEFAULT_LONG_PRESS_DURATION_MS,
  isMenuEnabled = true,
  onPress,
}: UseContextMenuPressGateParams): UseContextMenuPressGateResult {
  const pressStartedAtRef = useRef(0)

  const onPressIn = useEvent(() => {
    // Keep earliest press-in of this contact (survives Pressable mid-gesture resets), unless it is
    // stale: a gesture the native menu consumed never reports its end, leaving the timestamp behind.
    const startedAt = pressStartedAtRef.current
    const now = Date.now()
    if (startedAt === 0 || now - startedAt > MAX_CONTACT_AGE_MS) {
      pressStartedAtRef.current = now
    }
  })

  const handlePress = useEvent(() => {
    const startedAt = pressStartedAtRef.current
    pressStartedAtRef.current = 0
    // Without an enabled menu a long press opens nothing, so there is no navigation to suppress.
    if (isMenuEnabled && startedAt !== 0 && Date.now() - startedAt >= duration) {
      return
    }
    onPress?.()
  })

  const onPressOut = useEvent(() => {
    const startedAt = pressStartedAtRef.current
    // A long press keeps its timestamp: clearing it would let an `onPress` delivered after this
    // macrotask read 0 and navigate anyway. MAX_CONTACT_AGE_MS reclaims it on the next contact.
    if (startedAt === 0 || Date.now() - startedAt >= duration) {
      return
    }
    // onPress often runs after onPressOut; clear on next macrotask if unused.
    setTimeout(() => {
      if (pressStartedAtRef.current === startedAt) {
        pressStartedAtRef.current = 0
      }
    }, 0)
  })

  return { onPressIn, onPressOut, handlePress }
}
