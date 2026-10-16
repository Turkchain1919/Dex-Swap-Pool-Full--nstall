import { commonPressStyle } from 'ui/src/components/buttons/Button/components/CustomButtonFrame/constants'

// We have this because, if `commonPressStyle` is applied at the top level, it gets overridden by any additional `pressStyle` passed in via a subsequent variant
export const withCommonPressStyle = <TStyle extends object>(style: TStyle): TStyle & typeof commonPressStyle => ({
  ...commonPressStyle,
  ...style,
})
