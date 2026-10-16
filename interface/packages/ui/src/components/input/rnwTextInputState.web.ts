/**
 * RNW's `Keyboard.dismiss()` (and anything else going through `TextInputState.blurTextInput`)
 * blurs whatever node its TextInputState singleton holds. RNW's own TextInput registered its
 * host node in its focus/blur handlers — the rebuilt Input must do the same or those calls
 * silently no-op on web.
 */
// Deep import into RNW's dist layout — fragile by nature: an RNW upgrade that moves the
// module breaks this import (loudly, at build time). It is the ONLY way to reach the same
// TextInputState instance Keyboard.dismiss() uses; the singleton is not re-exported.
// @ts-expect-error -- react-native-web ships no types; TextInputState is not re-exported from its index
import TextInputStateModule from 'react-native-web/dist/modules/TextInputState'

type RnwTextInputState = { _currentlyFocusedNode: unknown }

const TextInputState = TextInputStateModule as RnwTextInputState

export function registerFocusedInput(node: unknown): void {
  TextInputState._currentlyFocusedNode = node
}

export function unregisterFocusedInput(): void {
  TextInputState._currentlyFocusedNode = null
}
