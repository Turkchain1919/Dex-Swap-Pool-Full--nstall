import MaskedView from '@react-native-masked-view/masked-view'
import { LinearGradientCompat } from '@universe/mycelium/linear-gradient-compat'
import { TextCompat } from '@universe/mycelium/text-compat'
import type { GradientTextProps } from 'ui/src/components/text/GradientText'

export function GradientText({ gradient, children, ...props }: GradientTextProps): JSX.Element {
  return (
    <MaskedView maskElement={<TextCompat {...props}>{children}</TextCompat>}>
      <LinearGradientCompat {...gradient}>
        <TextCompat {...props} opacity={0}>
          {children}
        </TextCompat>
      </LinearGradientCompat>
    </MaskedView>
  )
}
