/**
 * Keep the `AnimatedFlexCompat` re-export below extensionless — an explicit
 * `.tsx` specifier defeats `.web`-priority bundler resolution and silently
 * pins production consumers to the throwing base stub.
 */
export { AnimatedFlexCompat } from './AnimatedFlexCompat'
export type { AnimatedFlexCompatProps } from './props'
