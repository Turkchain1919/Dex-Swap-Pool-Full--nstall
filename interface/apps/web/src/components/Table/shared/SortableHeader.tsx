import {
  clickableStyle,
  Flex,
  type FlexCompatProps,
  type IconSizeTokens,
  Text,
  type TextCompatProps,
} from '@universe/mycelium'
import { ArrowDown } from '@universe/mycelium/icons/ArrowDown'
import { ArrowUp } from '@universe/mycelium/icons/ArrowUp'
import { forwardRef, type ForwardRefExoticComponent, type RefAttributes } from 'react'

// Explicit return type: forwardRef's inferred type isn't nameable under declaration emit (TS2883) —
// its structural expansion reaches mycelium-internal prop-composition types that aren't exported.
export const ClickableHeaderRow: ForwardRefExoticComponent<FlexCompatProps & RefAttributes<HTMLDivElement>> =
  forwardRef<HTMLDivElement, FlexCompatProps>(function ClickableHeaderRow(props, ref) {
    return <Flex ref={ref} row alignItems="center" justifyContent="flex-end" {...clickableStyle} {...props} />
  })

export function HeaderArrow({
  orderDirection,
  size,
}: {
  orderDirection: 'asc' | 'desc'
  size: IconSizeTokens
}): JSX.Element {
  const Icon = orderDirection === 'asc' ? ArrowUp : ArrowDown
  return (
    // `hoverStyle`/`transition` sit outside the supported mycelium icon style surface (INFRA-3320); the
    // opacity fade moves to a wrapper instead of widening the icon contract.
    <Flex display="inline-flex" className="transition-opacity duration-[80ms] ease-in-out hover:opacity-50">
      <Icon size={size} color="$neutral1" />
    </Flex>
  )
}

export type HeaderSortTextProps = TextCompatProps & { active?: boolean }

export const HeaderSortText: ForwardRefExoticComponent<HeaderSortTextProps & RefAttributes<HTMLElement>> = forwardRef<
  HTMLElement,
  HeaderSortTextProps
>(function HeaderSortText({ active, ...rest }, ref) {
  return <Text ref={ref} variant="body3" color={active ? '$neutral1' : '$neutral2'} whiteSpace="nowrap" {...rest} />
})
