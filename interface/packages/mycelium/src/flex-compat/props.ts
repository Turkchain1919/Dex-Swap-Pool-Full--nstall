/**
 * Flex-specific layout props; universal style props (spacing, sizing,
 * visuals, positioning, transforms, shadows) live in `../compat/props`.
 *
 * `packages/tailwind/src/parity` type-checks that this contract covers
 * `FlexProps` up to an explicit exclusion list.
 */
import type * as React from 'react'
// Reused rather than re-declared, so the pool shape `flexStyleClasses`
// compiles cannot drift from the shared `$platform-web` surface.
import type { InheritedTextStyleProps } from '../compat/inherited-text-props'
import type {
  ColorValue,
  CompatProps,
  CompatPseudoProps,
  CompatStyleProps,
  DisplayValue,
  InsetShorthand,
  LongTailStyleProps,
  SizeValue,
  SpaceValue,
} from '../compat/props'

export type { GroupState, GroupStatePropKey, MediaPropKey } from '../compat/props'

export type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse' | 'unset'
export type AlignItems = 'stretch' | 'flex-start' | 'flex-end' | 'center' | 'baseline' | 'unset'
export type AlignSelf = 'auto' | AlignItems
export type JustifyContent =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'space-between'
  | 'space-around'
  | 'space-evenly'
  | 'unset'
export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse' | 'unset'

/** Flexbox layout props: the Tamagui `Flex` variants + flexbox style props. */
export interface FlexLayoutStyleProps {
  // Tamagui Flex variants
  row?: boolean
  shrink?: boolean
  grow?: boolean
  fill?: boolean
  centered?: boolean
  inset?: SpaceValue | InsetShorthand
  maxContent?: boolean

  // flexbox
  flexDirection?: FlexDirection
  alignItems?: AlignItems
  alignSelf?: AlignSelf
  justifyContent?: JustifyContent
  flexWrap?: FlexWrap
  flex?: number
  flexBasis?: SizeValue
  flexGrow?: number
  flexShrink?: number
  display?: DisplayValue
  gap?: SpaceValue
  rowGap?: SpaceValue
  columnGap?: SpaceValue
  /**
   * `$platform-web`-only — RN has no grid layout. Values are named
   * grid-template areas, an open-ended string family, so this can't ride the
   * closed-set class lane and always takes the arbitrary-property twin.
   */
  gridArea?: string
  /** `$platform-web`-only. Same `ColorValue` contract as everywhere else. */
  color?: ColorValue
}

/** The full Flex style-object surface: layout + universal styles + long tail. */
export type FlexCompatStyleProps = CompatStyleProps &
  FlexLayoutStyleProps &
  Omit<LongTailStyleProps, keyof (CompatStyleProps & FlexLayoutStyleProps)>

/** Pseudo-state style objects keyed to the Flex style surface. */
export type FlexCompatPseudoProps = CompatPseudoProps<FlexCompatStyleProps>

/**
 * `onScroll` is declared per-component rather than on the shared
 * `CompatEventProps` surface because ScrollViewCompat owns a
 * differently-shaped `onScroll` (the RN scroll payload) and one shared prop
 * couldn't carry both signatures. Type-level only: `dom.tsx` still forwards a
 * raw `onScroll` to every compat component at runtime, and ScrollViewCompat
 * re-attaches its translated handler AFTER that spread, so its RN-shaped
 * handler wins there.
 */
export interface FlexCompatOwnEventProps {
  onScroll?(this: void, event: React.UIEvent<HTMLElement>): void
}

/**
 * The `$platform-web` style slice beyond the base Flex surface: `textAlign`
 * compiles to a real `text-*` Tailwind utility (see `./flex-style-classes`),
 * not the generic long tail. Web-only, matching legacy Tamagui — the native
 * leg ignores this pool.
 */
export type FlexCompatPlatformWebStyleProps = FlexCompatStyleProps & InheritedTextStyleProps

/**
 * `title` is omitted because several call sites intersect `FlexProps` with
 * their own `title?: ReactNode`, and a Flex is a layout box, never itself the
 * thing with a tooltip. It is kept on every other compat component.
 *
 * `$platform-web` needs no widening: the shared `CompatPlatformProps` pool
 * already carries `InheritedTextStyleProps`.
 */
export type FlexCompatProps = Omit<CompatProps<FlexCompatStyleProps>, 'title'> & FlexCompatOwnEventProps
