import { Flex, type FlexCompatProps, Text, type TextCompatProps } from '@universe/mycelium'
import { forwardRef, type ForwardRefExoticComponent, type RefAttributes } from 'react'

// Explicit return type: forwardRef's inferred type isn't nameable under declaration emit (TS2883).
export const PriceDisplayContainer: ForwardRefExoticComponent<FlexCompatProps & RefAttributes<HTMLDivElement>> =
  forwardRef<HTMLDivElement, FlexCompatProps>(function PriceDisplayContainer(props, ref) {
    return <Flex ref={ref} row flexWrap="wrap" alignItems="center" columnGap="$spacing8" {...props} />
  })

export const ChartPriceText: ForwardRefExoticComponent<TextCompatProps & RefAttributes<HTMLElement>> = forwardRef<
  HTMLElement,
  TextCompatProps
>(function ChartPriceText({ '$platform-web': platformWeb, ...props }, ref) {
  return (
    <Text
      ref={ref}
      variant="heading3"
      // Merge, don't spread: Tamagui deep-merged a caller's object-valued prop into the config's value for the same key.
      $platform-web={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...platformWeb }}
      {...props}
    />
  )
})
