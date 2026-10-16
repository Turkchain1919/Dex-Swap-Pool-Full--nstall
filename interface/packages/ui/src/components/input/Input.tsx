import { forwardRef } from 'react'
import type { TextInput as RNTextInput } from 'react-native'
import type { InputProps } from 'ui/src/components/input/types'
import { PlatformSplitStubError } from 'utilities/src/errors'

export type { InputProps, InputStyleProps } from 'ui/src/components/input/types'

/** Instance type alias kept for consumers doing `forwardRef<Input>` (Tamagui exported the same alias). */
export type Input = RNTextInput

/**
 * Platform-split stub — bundlers resolve ./Input.web.tsx (raw <input>/<textarea> transcribing
 * the legacy Tamagui cascade and RNW's TextInput behaviors) or ./Input.native.tsx (plain
 * React Native TextInput). forwardRef so the stub presents the legs' public type to tsc,
 * which resolves this suffix-less module.
 */
export const Input = forwardRef<RNTextInput, InputProps>(function InputComponent(_props, _ref): JSX.Element {
  throw new PlatformSplitStubError('Input')
})

Input.displayName = 'Input'
