/* Deliberately Tamagui-free (INFRA-3318): the native Input leg renders a plain React Native
 * TextInput carrying the legacy Tamagui Input cascade resolved by useInputVisualState. */
import { forwardRef } from 'react'
import {
  type BlurEvent,
  type FocusEvent as NativeFocusEvent,
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
  type TextStyle,
} from 'react-native'
import { useInputVisualState } from 'ui/src/components/input/shared'
import type { InputProps } from 'ui/src/components/input/types'

export type { InputProps, InputStyleProps } from 'ui/src/components/input/types'

/** Instance type alias kept for consumers doing `forwardRef<Input>` (Tamagui exported the same alias). */
export type Input = RNTextInput

/**
 * Text input, rebuilt off Tamagui under the same `Input` export (INFRA-3318). Native leg:
 * a plain React Native TextInput. Focus visual state drives the enumerated focusStyle surface.
 */
export const Input = forwardRef<RNTextInput, InputProps>(function InputComponent(props, ref): JSX.Element {
  const {
    forwardProps,
    resolvedStyle,
    isEditable,
    placeholderColor,
    selectionColor,
    testID,
    onFocus,
    onBlur,
    setFocused,
  } = useInputVisualState(props)

  // `rows` is the web leg's textarea affordance — RN must not receive it.
  const { rows: _rows, ...nativeRest } = forwardProps

  const handleFocus = (e: NativeFocusEvent): void => {
    setFocused(true)
    onFocus?.(e)
  }
  const handleBlur = (e: BlurEvent): void => {
    setFocused(false)
    onBlur?.(e)
  }

  return (
    <RNTextInput
      ref={ref}
      {...(nativeRest as RNTextInputProps)}
      editable={isEditable}
      placeholderTextColor={placeholderColor}
      selectionColor={selectionColor}
      testID={testID}
      style={resolvedStyle as TextStyle}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  )
})

Input.displayName = 'Input'
