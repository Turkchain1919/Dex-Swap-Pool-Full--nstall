import type { JSX, PropsWithChildren } from 'react'
import type { SpaceTokens } from '../compat/space-tokens'
import { FlexCompat } from '../flex-compat/FlexCompat'

interface InsetProps {
  /** applies consistent padding to each side */
  all?: SpaceTokens
}

// Drop-in for the legacy Inset. Renders on the compat Flex, so cross-platform without its own leg split.
export function InsetCompat({ all = '$spacing16', children }: PropsWithChildren<InsetProps>): JSX.Element {
  return <FlexCompat p={all}>{children}</FlexCompat>
}
