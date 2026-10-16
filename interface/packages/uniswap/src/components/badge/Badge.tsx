import type { ColorTokens } from '@universe/mycelium'
import { Flex, Text } from '@universe/mycelium'
import { type GetProps, styled, type StyledComponent } from '@universe/mycelium/styled'

export enum BadgeVariant {
  WARNING = 'WARNING',
  SOFT = 'SOFT',
}

const BADGE_FRAME_VARIANTS = {
  badgeVariant: {
    SOFT: 'bg-accent2',
    WARNING: 'bg-warning',
  },
  placement: {
    start: 'rounded-tl-4 rounded-bl-4',
    middle: '',
    end: 'rounded-tr-4 rounded-br-4',
    only: 'rounded-4',
  },
} as const

const BADGE_FRAME_BASE = 'flex-row items-center gap-0.5 py-0.5 px-1.5 justify-center bg-surface3'

// Class tables transcribed from the parity fixture
// (packages/tailwind/src/parity/styled-factory/badge/frame.ts). The parent
// Text contributions deliberately ride the compat prop surface instead of
// classes (see Badge below): those pools compile to arbitrary-property
// utilities ([color:…], [display:…], [font-size:…]) that the base always
// emits, and a named class here cannot deterministically override them.
// Annotated explicitly: the inferred type isn't portable under declaration
// emit (TS2883).
const BadgeFrame: StyledComponent<typeof Text, typeof BADGE_FRAME_VARIANTS> = styled(Text, {
  base: BADGE_FRAME_BASE,
  variants: BADGE_FRAME_VARIANTS,
})

// Frame twin for the `icon` path. Same class table, so both pills render
// identically; the only difference is the host, and that difference is the
// whole point — see `icon` on BadgeProps.
const BadgeIconFrame: StyledComponent<typeof Flex, typeof BADGE_FRAME_VARIANTS> = styled(Flex, {
  base: BADGE_FRAME_BASE,
  variants: BADGE_FRAME_VARIANTS,
})

const BADGE_TEXT_COLOR: Record<BadgeVariant, ColorTokens> = {
  [BadgeVariant.SOFT]: '$accent1',
  [BadgeVariant.WARNING]: '$surface1',
}

// Both hosts' surfaces, so whichever frame a caller's props land on accepts
// them: `icon` picks the host, and a caller shouldn't have to know which.
type BadgeProps = GetProps<typeof BadgeFrame> &
  GetProps<typeof BadgeIconFrame> & {
    /** Presets the body4 type ramp (default is body3). */
    size?: 'small'
    /**
     * Leading element rendered inside the pill, before the label.
     *
     * Supplying it swaps the pill's host from Text to Flex and nests the label
     * in its own Text: the default frame is a Text, and a View child of an RN
     * Text does not lay out reliably on native. Props forward to the frame as
     * usual, except `maxWidth` and `numberOfLines`, which land on the label so
     * it truncates inside the pill instead of widening it. A Flex frame has no
     * text surface, so typography props beyond the `size` preset are inert in
     * this mode.
     */
    icon?: JSX.Element
  }

// The legacy config's `fontWeight: '500'` is intentionally not carried over:
// it was dead code in the live render — the `variant: 'body3'` preset was
// declared after it and its expansion overwrote the weight — so the
// conversion matches the live render (the variant's weight).
function Badge({ badgeVariant, size, icon, ...rest }: BadgeProps): JSX.Element {
  const variant = size === 'small' ? 'body4' : 'body3'
  const color = badgeVariant === undefined ? '$neutral2' : BADGE_TEXT_COLOR[badgeVariant]

  if (icon) {
    const { children, maxWidth, numberOfLines, ...frameProps } = rest
    return (
      <BadgeIconFrame badgeVariant={badgeVariant} {...frameProps}>
        {icon}
        <Text variant={variant} color={color} maxWidth={maxWidth} numberOfLines={numberOfLines}>
          {children}
        </Text>
      </BadgeIconFrame>
    )
  }

  return <BadgeFrame badgeVariant={badgeVariant} display="flex" variant={variant} color={color} {...rest} />
}

export default Badge
