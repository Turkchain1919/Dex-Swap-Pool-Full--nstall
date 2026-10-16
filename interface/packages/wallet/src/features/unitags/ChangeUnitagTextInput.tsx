import { PlatformSplitStubError } from 'utilities/src/errors'

export interface ChangeUnitagTextInputProps {
  autoFocus?: boolean
  value: string
  onChangeText: (text: string) => void
  onSubmitEditing: () => void
}

/**
 * Username input for the change-unitag sheet.
 * - Mobile: `BottomSheetTextInput` so the bottom sheet tracks the keyboard.
 * - Web/extension: plain `TextInput`.
 */
export function ChangeUnitagTextInput(_props: ChangeUnitagTextInputProps): JSX.Element {
  throw new PlatformSplitStubError('ChangeUnitagTextInput')
}
