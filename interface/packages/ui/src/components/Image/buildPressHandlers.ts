import { type GestureResponderEvent, UIManager } from 'react-native'
import { isWebRender } from 'ui/src/components/Image/isWebRender'

/** RN Pressability's DEFAULT_PRESS_RECT_OFFSETS — the retention rect legacy presses honored. */
const PRESS_RECT_OFFSETS = { top: 20, left: 20, right: 20, bottom: 30 }

// oxlint-disable-next-line max-params -- RN's measure() callback contract is 6 positional args
type MeasureCallback = (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void

/** Per-instance gesture state for the native press rect; owned by a ref in the component. */
export type PressTracker = {
  region: { pageX: number; pageY: number; width: number; height: number } | null
  inside: boolean
}

function isMeasurable(target: unknown): target is { measure: (callback: MeasureCallback) => void } {
  return typeof (target as { measure?: unknown } | null)?.measure === 'function'
}

/**
 * Web: a click, like Tamagui's web press events. Native: responder-based press mirroring
 * RN Pressability, which Tamagui attached to this same host view — release fires the
 * handler only from inside the press rect (view region + DEFAULT_PRESS_RECT_OFFSETS), so a
 * drag that lifts off the image does not fire, and a scroll/gesture claiming the responder
 * cancels the press outright.
 */
export function buildPressHandlers(
  onPress: ((event: GestureResponderEvent) => void) | null | undefined,
  tracker: PressTracker,
): Record<string, unknown> | undefined {
  if (onPress === undefined || onPress === null) {
    return undefined
  }
  if (isWebRender) {
    // SAFETY: react-native-web's onClick delivers a DOM MouseEvent — exactly what the legacy
    // Tamagui web press path delivered despite the prop's RN-shaped signature (kept for
    // styled() wrapper assignability). Typing the wire handler as MouseEvent means a web
    // caller that inspects the event sees the type that genuinely arrives.
    const onClick: (event: MouseEvent) => void = onPress as unknown as (event: MouseEvent) => void
    return { onClick }
  }
  return {
    onStartShouldSetResponder: (): boolean => true,
    // Pressability measures the view on grant to build the press rect (number handle →
    // UIManager.measure; Fabric ref → its own measure).
    onResponderGrant: (event: GestureResponderEvent): void => {
      tracker.inside = true
      tracker.region = null
      const target: unknown = event.currentTarget
      // oxlint-disable-next-line max-params -- RN's measure() callback contract is 6 positional args
      const onMeasure: MeasureCallback = (_x, _y, width, height, pageX, pageY) => {
        tracker.region = { pageX, pageY, width, height }
      }
      if (typeof target === 'number') {
        UIManager.measure(target, onMeasure)
      } else if (isMeasurable(target)) {
        target.measure(onMeasure)
      }
    },
    onResponderMove: (event: GestureResponderEvent): void => {
      const region = tracker.region
      if (!region) {
        // Unmeasured: Pressability emits no LEAVE_PRESS_RECT before the region resolves.
        return
      }
      const { pageX, pageY } = event.nativeEvent
      tracker.inside =
        pageX >= region.pageX - PRESS_RECT_OFFSETS.left &&
        pageX <= region.pageX + region.width + PRESS_RECT_OFFSETS.right &&
        pageY >= region.pageY - PRESS_RECT_OFFSETS.top &&
        pageY <= region.pageY + region.height + PRESS_RECT_OFFSETS.bottom
    },
    onResponderTerminationRequest: (): boolean => true,
    // RESPONDER_RELEASE from a *_PRESS_OUT state never calls onPress in Pressability.
    onResponderRelease: (event: GestureResponderEvent): void => {
      if (tracker.inside) {
        onPress(event)
      }
    },
  }
}
