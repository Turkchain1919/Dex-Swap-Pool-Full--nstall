import { Flex, type FlexCompatProps } from '@universe/mycelium'
import { forwardRef, type ForwardRefExoticComponent, type RefAttributes } from 'react'

// Explicit return type: forwardRef's inferred type isn't nameable under declaration emit (TS2883).
export const Container: ForwardRefExoticComponent<FlexCompatProps & RefAttributes<HTMLDivElement>> = forwardRef<
  HTMLDivElement,
  FlexCompatProps
>(function Container({ $lg: lg, ...props }, ref) {
  return (
    <Flex
      ref={ref}
      gap={32}
      p="$spacing24"
      borderRadius="$rounded20"
      borderWidth="$spacing1"
      borderColor="$surface3"
      overflow="hidden"
      width="100%"
      // Merge, don't spread: Tamagui deep-merged a caller's object-valued prop into the config's value for the same key.
      $lg={{ p: '$spacing16', ...lg }}
      {...props}
    />
  )
})

export const PageLayout: ForwardRefExoticComponent<FlexCompatProps & RefAttributes<HTMLDivElement>> = forwardRef<
  HTMLDivElement,
  FlexCompatProps
>(function PageLayout({ $xxl: xxl, $xl: xl, $sm: sm, ...props }, ref) {
  return (
    <Flex
      ref={ref}
      width="100%"
      maxWidth={1200}
      mx="auto"
      // Merge, don't spread: Tamagui deep-merged a caller's object-valued prop into the config's value for the same key.
      $xxl={{ px: '$spacing40', ...xxl }}
      $xl={{ px: '$spacing24', ...xl }}
      $sm={{ px: '$spacing8', ...sm }}
      {...props}
    />
  )
})
