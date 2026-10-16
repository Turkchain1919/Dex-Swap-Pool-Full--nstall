import type { JSX } from 'react'
import { StyleSheet, View } from 'react-native'
import type { WidthAnimatorProps } from './WidthAnimatorProps'

/**
 * Native `WidthAnimator`: functional stub per the ratified INFRA-3289
 * animations strategy — expand/collapse is instant (no width animation).
 * The sole call site in the repo (Swap `index.tsx`) is web-only, so no
 * native surface loses motion today. If motion parity is ever needed, the
 * strategy names the shape: Reanimated `useAnimatedStyle` width + `onLayout`.
 *
 * Divergence from the web leg: when `contentWidth` is unset, this stub falls
 * through to RN's natural width, while the web leg deliberately stays
 * bug-compatible and never opens (its self-measurement reads 0). Dead code
 * today — no native call site exists — but a future native caller relying on
 * either behavior must reconcile the two legs first.
 */
export function WidthAnimator({ open = true, height, contentWidth, mt, children }: WidthAnimatorProps): JSX.Element {
  return (
    <View
      style={[
        open ? styles.open : styles.closed,
        // Collapsed pins width 0; open uses contentWidth, or natural width when unset.
        { height, marginTop: mt, width: open ? contentWidth : 0 },
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  closed: { overflow: 'hidden' },
  open: { overflow: 'visible' },
})
