import { isMobileApp } from '@universe/environment'
import { Flex, type FlexCompatProps } from '@universe/mycelium'

export function WarningModalInfoContainer({ children, ...rest }: FlexCompatProps): JSX.Element {
  return (
    <Flex
      width="100%"
      backgroundColor="$surface2"
      px="$spacing16"
      py={isMobileApp ? '$spacing8' : '$spacing12'}
      alignItems="center"
      flexWrap="nowrap"
      {...rest}
    >
      {children}
    </Flex>
  )
}
