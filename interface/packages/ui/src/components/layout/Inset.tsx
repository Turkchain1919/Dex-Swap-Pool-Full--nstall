import type { SpaceTokens } from '@universe/mycelium'
import { Flex } from '@universe/mycelium'
import { PropsWithChildren } from 'react'
interface InsetProps {
  /**
   * applies consistent padding to each side
   *
   * `$`-tokens only. Mycelium's SpaceTokens is the `$`-token half of tamagui's, which also
   * admitted raw numbers, so `all={12}` is rejected by design rather than by oversight.
   */
  all?: SpaceTokens
}

/**
 * Spacing components that indents content on all four sides
 *
 * Inspired by https://medium.com/eightshapes-llc/space-in-design-systems-188bcbae0d62
 *
 * [internal]:
 *  API can be expanded to specific sides
 *  Debug options to color bg to debug spacing
 */
export function Inset({ all = '$spacing16', children }: PropsWithChildren<InsetProps>): JSX.Element {
  return <Flex p={all}>{children}</Flex>
}
