import { PlatformSplitStubError } from 'utilities/src/errors'

/**
 * RNW TextInputState singleton bridge, platform-split stub — bundlers resolve
 * ./rnwTextInputState.web.ts (points RNW's TextInputState at the rebuilt Input's host node so
 * `Keyboard.dismiss()` works) or ./rnwTextInputState.native.ts (no-op: RN's own TextInput
 * manages TextInputState itself).
 */
export function registerFocusedInput(_node: unknown): void {
  throw new PlatformSplitStubError('registerFocusedInput')
}

export function unregisterFocusedInput(): void {
  throw new PlatformSplitStubError('unregisterFocusedInput')
}
