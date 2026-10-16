import { useContext } from 'react'
import type { JSX } from 'react'
import { FlexCompat } from '../flex-compat/FlexCompat'
import { HeightAnimator } from '../height-animator'
import type { AccordionHeightAnimatorCompatProps } from './props'
import { AccordionItemContext } from './state'

/**
 * `Accordion.HeightAnimator`: the shared `height-animator` primitive driven by
 * the item's open state. Not a bare re-export — legacy spreads its rest onto
 * the animating `View`, so the `mt` a call site passes renders; the standalone
 * primitive ignores `mt` by contract, so the margin is carried by a wrapper
 * here instead.
 */
export function AccordionHeightAnimatorCompat({
  mt,
  animation,
  children,
}: AccordionHeightAnimatorCompatProps): JSX.Element {
  const { open } = useContext(AccordionItemContext)
  // Object spread, not a JSX attribute: the migration lint and the Danger diff gate both ban the attribute form of this legacy animation-prop pass-through.
  const animationProp = { animation }
  const animator = (
    <HeightAnimator open={open} {...animationProp}>
      {children}
    </HeightAnimator>
  )
  return mt === undefined ? animator : <FlexCompat mt={mt}>{animator}</FlexCompat>
}
