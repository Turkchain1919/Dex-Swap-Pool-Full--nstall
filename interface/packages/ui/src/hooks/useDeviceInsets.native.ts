import { DEFAULT_BOTTOM_INSET } from '@universe/mycelium/theme-hooks-compat'
import type { EdgeInsets } from 'react-native-safe-area-context'
// oxlint-disable-next-line no-restricted-imports -- useSafeAreaInsets is allowed for this use case
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export function useDeviceInsets(): EdgeInsets {
  const { top, right, bottom, left } = useSafeAreaInsets()

  // DEFAULT_BOTTOM_INSET is a design floor, not a measurement: devices with no on-screen navigation
  // (iOS home-button models) report 0. Don't infer navigation mode from `bottom` downstream.
  const bottomInset = bottom === 0 ? DEFAULT_BOTTOM_INSET : bottom

  // A new object every render: the EdgeInsets object is owned and memoized by
  // react-native-safe-area-context, so it must never be written to. Consumers that need a stable
  // reference get one from useAppInsets, which memoizes on the four numbers.
  return { top, right, bottom: bottomInset, left }
}
