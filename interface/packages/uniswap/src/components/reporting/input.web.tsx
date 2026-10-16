import { fonts } from '@universe/mycelium'
import { TextInput } from 'uniswap/src/components/input/TextInput'
import type { ReportInputProps } from 'uniswap/src/components/reporting/input'

const MAX_REPORT_TEXT_LENGTH = 500

export function ReportInput({ setReportText, placeholder }: ReportInputProps): JSX.Element {
  return (
    <TextInput
      multiline
      fontFamily="$body"
      fontSize={fonts.body3.fontSize}
      fontWeight={fonts.body3.fontWeight}
      borderRadius="$rounded12"
      placeholder={placeholder}
      py="$spacing12"
      backgroundColor="$surface2"
      numberOfLines={3}
      minHeight={96}
      maxLength={MAX_REPORT_TEXT_LENGTH}
      width="100%"
      returnKeyType="done"
      onChangeText={setReportText}
    />
  )
}
