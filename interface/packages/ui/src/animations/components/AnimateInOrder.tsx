import { FlexProps } from '@universe/mycelium'
import { PropsWithChildren } from 'react'
import { EnterFromStyle } from 'ui/src/animations/components/AnimateInOrder.constants'
import { PlatformSplitStubError } from 'utilities/src/errors'

export { ANIMATE_IN_ORDER_DELAY_MS } from 'ui/src/animations/components/AnimateInOrder.constants'

export type AnimateInOrderProps = PropsWithChildren<
  {
    index: number
    delayMs?: number
    /** Values the child animates *from*. */
    enterStyle?: EnterFromStyle
  } & Omit<FlexProps, 'animation' | 'enterStyle' | 'exitStyle' | 'opacity' | 'scale'>
>

/**
 * Reveals children one after another, `index * delayMs` apart.
 * Children mount with the rest of the tree and are revealed by animating opacity/scale.
 *
 * The reveal curve is owned by the component and not overridable: web transitions with the
 * `bouncy` Tamagui preset, native runs a Reanimated spring with the same values. There is no
 * exit animation on either platform.
 */
export function AnimateInOrder(_props: AnimateInOrderProps): JSX.Element {
  throw new PlatformSplitStubError('AnimateInOrder')
}
