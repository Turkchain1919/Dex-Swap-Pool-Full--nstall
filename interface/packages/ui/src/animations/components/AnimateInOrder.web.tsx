import { Flex } from '@universe/mycelium'
import { useEffect, useState } from 'react'
import type { AnimateInOrderProps } from 'ui/src/animations/components/AnimateInOrder'
import {
  ANIMATE_IN_ORDER_ANIMATION,
  ANIMATE_IN_ORDER_DELAY_MS,
  DEFAULT_ENTER_STYLE,
} from 'ui/src/animations/components/AnimateInOrder.constants'
export { ANIMATE_IN_ORDER_DELAY_MS } from 'ui/src/animations/components/AnimateInOrder.constants'

/**
 * Web: reveals the mounted child via a Tamagui prop animation (CSS transition).
 */
export const AnimateInOrder = ({
  children,
  index,
  enterStyle = DEFAULT_ENTER_STYLE,
  delayMs = ANIMATE_IN_ORDER_DELAY_MS,
  ...rest
}: AnimateInOrderProps): JSX.Element => {
  const [hasEntered, setHasEntered] = useState(false)

  useEffect(() => {
    const enterTimer = setTimeout(() => setHasEntered(true), index * delayMs)
    return () => clearTimeout(enterTimer)
  }, [index, delayMs])

  return (
    <Flex
      animation={ANIMATE_IN_ORDER_ANIMATION}
      animateOnly={['transform', 'opacity']}
      opacity={hasEntered ? 1 : (enterStyle.opacity ?? DEFAULT_ENTER_STYLE.opacity)}
      scale={hasEntered ? 1 : (enterStyle.scale ?? DEFAULT_ENTER_STYLE.scale)}
      {...rest}
    >
      {children}
    </Flex>
  )
}
