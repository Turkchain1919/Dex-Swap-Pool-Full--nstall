import { PlatformSplitStubError } from 'utilities/src/errors'

export interface ReportInputProps {
  placeholder?: string
  setReportText: (text: string) => void
}

/**
 * Free-text field for report flows.
 * - Native: sheet-registered `BottomSheetTextInput` so the bottom sheet tracks the keyboard.
 * - Web/extension: plain `TextInput`.
 */
export function ReportInput(_props: ReportInputProps): JSX.Element {
  throw new PlatformSplitStubError('ReportInput')
}
