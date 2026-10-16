/**
 * Drop-in Tailwind twin of the legacy Tamagui `Square` (INFRA-3750 sibling
 * widening — `packages/ui/src/index.ts` re-exports it straight from
 * `tamagui`, no rebuild). Legacy `Square` is `styled(ThemeableStack, {
 * alignItems: 'center', justifyContent: 'center', variants: { size: {
 * '...size': getShapeSize } } })` (`@tamagui/shapes`): `getShapeSize` maps
 * one `size` value onto `width`/`height`/`minWidth`/`maxWidth`/`minHeight`/
 * `maxHeight` all at once (a token, resolved through `tokens.size`, or a
 * raw number/string) — i.e. a centered box with equal width and height.
 *
 * No platform-split leg needed: this is a pure composition over the compat
 * `Flex`, which already has both legs. `centered` reproduces the frame
 * default (`FlexLayoutStyleProps.centered` → `items-center justify-center`,
 * the same variant Flex itself exposes); `size` rides the SAME `SizeValue`
 * contract (and the SAME token resolution) Flex's own `width`/`height`
 * already use, so a legacy `size="$spacing48"` or `size={48}` call site
 * resolves identically without this component doing any token work itself.
 */
import { forwardRef } from 'react'
// Type-only: erased at build time, so this file stays safe for the web
// graph to resolve (the `../compat/native-style` precedent).
import type { View } from 'react-native'
import type { SizeValue } from '../compat/props'
import { FlexCompat } from '../flex-compat/FlexCompat'
import type { FlexCompatProps } from '../flex-compat/props'

export interface SquareCompatProps extends Omit<
  FlexCompatProps,
  'width' | 'height' | 'minWidth' | 'maxWidth' | 'minHeight' | 'maxHeight'
> {
  /** Legacy `size` variant: one token/number/string sets width, height, and their min/max twins. */
  size?: SizeValue
}

export const SquareCompat = forwardRef<HTMLElement | View, SquareCompatProps>(function SquareCompat(
  { size, ...rest },
  ref,
) {
  return (
    <FlexCompat
      ref={ref}
      centered
      width={size}
      height={size}
      minWidth={size}
      maxWidth={size}
      minHeight={size}
      maxHeight={size}
      {...rest}
    />
  )
})
