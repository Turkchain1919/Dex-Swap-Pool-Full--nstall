import { Flex, type FlexProps } from '@universe/mycelium'
import { type ComponentRef, forwardRef } from 'react'
/**
 * Extended FlexProps that accepts Reanimated entering/exiting props and animated styles.
 * On web, Reanimated props are ignored - animations use CSS via Tamagui instead.
 */
export type AnimatedFlexProps = Omit<FlexProps, 'style'> & {
  // Style prop that accepts both regular and animated styles from useAnimatedStyle
  // oxlint-disable-next-line typescript/no-explicit-any -- Style prop accepts animated styles which have complex types
  style?: any
  // Reanimated entering/exiting animations - used on native, ignored on web
  // oxlint-disable-next-line typescript/no-explicit-any -- Reanimated animation types are complex and platform-specific
  entering?: any
  // oxlint-disable-next-line typescript/no-explicit-any -- Reanimated animation types are complex and platform-specific
  exiting?: any
  // Layout animation
  // oxlint-disable-next-line typescript/no-explicit-any -- Reanimated animation types are complex and platform-specific
  layout?: any
}

type AnimatedFlexComponent = React.ForwardRefExoticComponent<
  AnimatedFlexProps & React.RefAttributes<ComponentRef<typeof Flex>>
>

/**
 * Prefer Reanimated `entering`/`exiting` worklets (built with `withSporeCurve`) for enter/exit and transitions —
 * this is the sanctioned pattern going forward as the codebase moves off Tamagui. Reach for a raw
 * `useAnimatedStyle` worklet only for styles outside that lifecycle — Reanimated 4 strict mode rejects animated
 * styles on non-animated components, and this wraps Flex via createAnimatedComponent.
 *
 *    See: packages/tailwind/src/animations/reanimated.ts
 *
 * Platform-specific implementations:
 * - Web: Uses CSS animations (AnimatedFlex.web.tsx)
 * - Native: Uses react-native-reanimated over the mycelium Flex (AnimatedFlex.native.tsx).
 *   The mycelium base forwards only its compat allow-list — props outside it
 *   (e.g. Tamagui `animation`, `onPress`) are dropped with a dev-only warning.
 */
export const AnimatedFlex: AnimatedFlexComponent = forwardRef<ComponentRef<typeof Flex>, AnimatedFlexProps>(
  function AnimatedFlex(_, __) {
    throw new Error('AnimatedFlex: Implemented in `.native.tsx` and `.web.tsx` files')
  },
)

AnimatedFlex.displayName = 'AnimatedFlex'
