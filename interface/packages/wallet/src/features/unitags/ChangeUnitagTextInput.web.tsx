import { fonts } from '@universe/mycelium'
import { TextInput } from 'uniswap/src/components/input/TextInput'
import type { ChangeUnitagTextInputProps } from 'wallet/src/features/unitags/ChangeUnitagTextInput'

export function ChangeUnitagTextInput({
  autoFocus,
  value,
  onChangeText,
  onSubmitEditing,
}: ChangeUnitagTextInputProps): JSX.Element {
  return (
    <TextInput
      autoFocus={autoFocus}
      autoCapitalize="none"
      color="$neutral1"
      fontFamily="$subHeading"
      fontSize={fonts.subheading1.fontSize}
      fontWeight="$book"
      m="$none"
      maxLength={20}
      numberOfLines={1}
      px="$none"
      py="$spacing20"
      returnKeyType="done"
      value={value}
      width="100%"
      onChangeText={onChangeText}
      onSubmitEditing={onSubmitEditing}
    />
  )
}
