/**
 * The `Accordion` compat prop contract: the legacy `ui/src` surface (a raw
 * `@tamagui/accordion` re-export) on compat Flex hosts. Platform-neutral on
 * purpose — both legs and the base stub import these types, so the legs
 * cannot drift apart on the public surface.
 */
import type { SporeAnimationCurveName } from '@universe/tailwind/animations'
import type { FC, ReactNode } from 'react'
import type { SpaceValue } from '../compat/props'
import type { FlexCompatProps } from '../flex-compat/props'
import type { TextCompatProps } from '../text-compat/props'

/** At most one item open; `collapsible` gates re-closing it (legacy default false). */
export interface AccordionSingleValueProps {
  type?: 'single'
  collapsible?: boolean
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

/** Any number of items open, always collapsible. */
export interface AccordionMultipleValueProps {
  type: 'multiple'
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
}

export type AccordionValueProps = AccordionSingleValueProps | AccordionMultipleValueProps

/**
 * The value-machine union collapsed for internal destructuring (the legs and
 * the state hook); the public contract stays the discriminated union above.
 */
export interface AccordionValuePropsLoose {
  type?: 'single' | 'multiple'
  collapsible?: boolean
  /** Root-level disable: legacy gates every item (`accordionContext.disabled || props.disabled`). */
  disabled?: boolean
  value?: string | string[]
  defaultValue?: string | string[]
  onValueChange?: ((value: string) => void) | ((value: string[]) => void)
}

/** The root `Accordion` prop contract: the compat Flex surface + the value machine knobs. */
export type AccordionCompatProps = Omit<FlexCompatProps, 'onValueChange'> & AccordionValueProps

export interface AccordionItemExtraProps {
  /** Identifies the item in the root's `value`; unique per accordion. */
  value: string
  disabled?: boolean
}

export type AccordionItemCompatProps = FlexCompatProps & AccordionItemExtraProps

/** Text-based, not Flex: both legs host the Header on the Text twin (legacy is a Tamagui `H1` text frame). */
export type AccordionHeaderCompatProps = TextCompatProps

/** Legacy `Collapsible.Trigger` resolves function children with the item's open state. */
export type AccordionTriggerChildren = ReactNode | ((state: { open: boolean }) => ReactNode)

export type AccordionTriggerCompatProps = Omit<FlexCompatProps, 'children'> & {
  children?: AccordionTriggerChildren
}

export interface AccordionContentExtraProps {
  /** Keep the content mounted (and visible, matching legacy) while the item is closed. */
  forceMount?: true
}

export type AccordionContentCompatProps = FlexCompatProps & AccordionContentExtraProps

/**
 * The `Accordion.HeightAnimator` prop contract, scoped to the props live call
 * sites pass. Legacy spreads its rest onto a Tamagui `View`, so `mt` renders
 * (unlike the standalone `ui/src` `HeightAnimator`, which ignores it).
 */
export interface AccordionHeightAnimatorCompatProps {
  children?: ReactNode
  animation?: SporeAnimationCurveName
  mt?: SpaceValue
}

/** The assembled compat: the root with the legacy statics, one shape for both platform legs. */
export interface AccordionCompatComponent extends FC<AccordionCompatProps> {
  Item: FC<AccordionItemCompatProps>
  Header: FC<AccordionHeaderCompatProps>
  Trigger: FC<AccordionTriggerCompatProps>
  Content: FC<AccordionContentCompatProps>
  HeightAnimator: FC<AccordionHeightAnimatorCompatProps>
}
