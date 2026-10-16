/**
 * @deprecated Import `AnimatedFlex` from `@universe/mycelium` (or
 * `@universe/mycelium/animated-flex-compat`) instead of `ui/src`.
 *
 * Native re-export of the mycelium implementation — both were
 * `createAnimatedComponent` over the same mycelium Flex native leg. The web
 * leg is NOT a re-export: it still renders the Tamagui Flex, so web call
 * sites keep their Tamagui styling until they convert.
 */
export { AnimatedFlexCompat as AnimatedFlex } from '@universe/mycelium/animated-flex-compat'
