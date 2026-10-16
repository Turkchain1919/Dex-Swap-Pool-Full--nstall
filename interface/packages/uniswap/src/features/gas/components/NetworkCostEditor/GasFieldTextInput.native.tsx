import { fonts, spacing } from '@universe/mycelium'
import { useSporeColors } from '@universe/mycelium/theme-hooks-compat'
import { useEffect, useRef } from 'react'
import type { TextInput } from 'react-native'
import { useBottomSheetContext } from 'uniswap/src/components/modals/BottomSheetContext'
import { BottomSheetTextInput } from 'uniswap/src/components/modals/Modal'
import type { GasFieldTextInputProps } from 'uniswap/src/features/gas/components/NetworkCostEditor/GasFieldTextInput'

export function GasFieldTextInput({
  accessibilityLabel,
  autoFocus,
  keyboardType,
  maxLength,
  value,
  onChangeText,
}: GasFieldTextInputProps): JSX.Element {
  const colors = useSporeColors()
  const { isSheetReady } = useBottomSheetContext()
  const inputRef = useRef<TextInput>(null)

  // Focus after the sheet begins animating: autofocus at mount races the sheet open,
  // leaving it parked behind the keyboard (gorhom only lifts the sheet once a
  // BottomSheetTextInput registers focus while the sheet has detents).
  useEffect(() => {
    if (autoFocus && isSheetReady) {
      inputRef.current?.focus()
    }
  }, [autoFocus, isSheetReady])

  return (
    <BottomSheetTextInput
      ref={inputRef}
      accessibilityLabel={accessibilityLabel}
      keyboardType={keyboardType}
      maxLength={maxLength}
      placeholderTextColor={colors.neutral3.val}
      style={{
        flex: 1,
        color: colors.neutral1.val,
        fontSize: fonts.body2.fontSize,
        fontFamily: fonts.body2.family,
        padding: spacing.none,
      }}
      value={value}
      onChangeText={onChangeText}
    />
  )
}
