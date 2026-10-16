import { isMobileWeb } from '@universe/environment'
import { Flex, TouchableArea } from '@universe/mycelium'
import type { ComponentProps } from 'react'
type FlexProps = ComponentProps<typeof Flex>

// On desktop web, TouchableArea produces unwanted borders (Tamagui bug), so we
// render a plain flex row instead. On mobile web we keep TouchableArea for tap
// feedback and long-press styling.
const DesktopRowContainer = ({ children, ...rest }: FlexProps) => (
  <Flex row alignItems="center" {...rest}>
    {children}
  </Flex>
)

// Cast: the union's inferred type isn't nameable under declaration emit (TS2883), and callers
// use the Flex prop surface both legs accept.
export const MobileTouchableArea = (isMobileWeb ? TouchableArea : DesktopRowContainer) as (
  props: FlexProps,
) => JSX.Element
