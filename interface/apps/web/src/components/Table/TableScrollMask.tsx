import { View, type ViewCompatProps, zIndexes } from '@universe/mycelium'
import { forwardRef, type ForwardRefExoticComponent, type RefAttributes } from 'react'

/** Right-edge fade overlay when table has pinned columns and can scroll horizontally. Used in both header (SideScrollButtons) and body areas. */
// Explicit return type: forwardRef's inferred type isn't nameable under declaration emit (TS2883) —
// its structural expansion reaches mycelium-internal prop-composition types that aren't exported.
export const TableScrollMask: ForwardRefExoticComponent<ViewCompatProps & RefAttributes<HTMLDivElement>> = forwardRef<
  HTMLDivElement,
  ViewCompatProps
>(function TableScrollMask(props, ref) {
  return (
    <View
      ref={ref}
      position="absolute"
      zIndex={zIndexes.default}
      top={0}
      bottom={0}
      right={1}
      width={20}
      pointerEvents="none"
      background="linear-gradient(to right, transparent, var(--surface1))"
      {...props}
    />
  )
})

/** Bottom fade overlay indicating vertically scrollable content. */
export const TableBottomFade: ForwardRefExoticComponent<ViewCompatProps & RefAttributes<HTMLDivElement>> = forwardRef<
  HTMLDivElement,
  ViewCompatProps
>(function TableBottomFade(props, ref) {
  return (
    <View
      ref={ref}
      position="absolute"
      zIndex={zIndexes.default}
      bottom={0}
      left={0}
      right={0}
      height={100}
      pointerEvents="none"
      background="linear-gradient(to bottom, transparent, var(--surface1))"
      borderBottomRightRadius="$rounded12"
      borderBottomLeftRadius="$rounded12"
      {...props}
    />
  )
})
