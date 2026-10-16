import { Flex, type FlexCompatProps as FlexProps } from '@universe/mycelium'
import { useAppInsets } from 'uniswap/src/hooks/useAppInsets'
import { useBottomScreenGap } from 'uniswap/src/hooks/useBottomScreenGap'

export type BottomScreenFooterProps = FlexProps & {
  /**
   * How the safe-area part of the bottom gap is applied:
   * - `padding` (default): the footer background extends under the home indicator
   * - `margin`: the footer background stops above the home indicator
   * - `none`: a parent (`Screen` bottom edge or `Modal`) already applies `insets.bottom`
   */
  insetMode?: 'padding' | 'margin' | 'none'
}

/**
 * Container for bottom-anchored footer content (CTAs, sheet footers).
 * Applies the standard bottom screen gap from `useBottomScreenGap` below its children.
 */
export function BottomScreenFooter({ insetMode = 'padding', children, ...rest }: BottomScreenFooterProps): JSX.Element {
  const insets = useAppInsets()
  const { bottomScreenTotalGap, bottomScreenExtraGap } = useBottomScreenGap()

  // `rest` spreads first so a caller's `pb`/`p` can't cancel the gap this primitive guarantees
  return (
    <Flex
      {...rest}
      {...(insetMode === 'margin' ? { mb: insets.bottom } : {})}
      pb={insetMode === 'padding' ? bottomScreenTotalGap : bottomScreenExtraGap}
    >
      {children}
    </Flex>
  )
}
