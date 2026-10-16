import { useCallback, useContext, useState } from 'react'
import type { JSX } from 'react'
import { markMyceliumPrimitive } from '../compat/primitive-marker'
import { FlexCompat } from '../flex-compat/FlexCompat'
import type { FlexCompatProps } from '../flex-compat/props'
import { TextCompat } from '../text-compat/TextCompat'
import {
  CONTENT_FRAME_DEFAULTS,
  NATIVE_TRIGGER_FRAME_DEFAULTS,
  NATIVE_TRIGGER_PRESSED_BACKGROUND,
} from './frame-defaults'
import { AccordionHeightAnimatorCompat } from './height-animator-static'
import type {
  AccordionCompatComponent,
  AccordionCompatProps,
  AccordionContentCompatProps,
  AccordionHeaderCompatProps,
  AccordionItemCompatProps,
  AccordionTriggerCompatProps,
  AccordionValuePropsLoose,
} from './props'
import {
  AccordionItemContext,
  AccordionRootContext,
  useAccordionItemContextValue,
  useAccordionValueState,
} from './state'

/**
 * React Native rendering of AccordionCompat: Radix is web-only, so this leg
 * drives the shared value machine (`./state`) itself — legacy semantics,
 * which also have no roving focus on native (its keyboard handling is
 * web-gated). The trigger swaps the legacy pressStyle background in state,
 * since the CSS pseudo scopes the web frame defaults ride do not exist here.
 */
function AccordionRoot(props: AccordionCompatProps): JSX.Element {
  const { type, collapsible, disabled, value, defaultValue, onValueChange, children, ...frameProps } = props as Omit<
    FlexCompatProps,
    'onValueChange'
  > &
    AccordionValuePropsLoose
  const state = useAccordionValueState({ type, collapsible, disabled, value, defaultValue, onValueChange })
  return (
    <AccordionRootContext.Provider value={state}>
      <FlexCompat flexDirection="column" {...frameProps}>
        {children}
      </FlexCompat>
    </AccordionRootContext.Provider>
  )
}

function AccordionItem(props: AccordionItemCompatProps): JSX.Element {
  const { value, disabled, children, ...frameProps } = props
  const itemContext = useAccordionItemContextValue(value, disabled)
  return (
    <AccordionItemContext.Provider value={itemContext}>
      <FlexCompat {...frameProps}>{children}</FlexCompat>
    </AccordionItemContext.Provider>
  )
}

function AccordionHeader(props: AccordionHeaderCompatProps): JSX.Element {
  const { children, ...frameProps } = props
  // A text host like the web leg: the legacy Header is a Tamagui `H1` text
  // frame, and an RN View would throw on a bare string child.
  return <TextCompat {...frameProps}>{children}</TextCompat>
}

function AccordionTrigger(props: AccordionTriggerCompatProps): JSX.Element {
  const { children, onPress, onPressIn, onPressOut, pressStyle, ...frameProps } = props
  const { value, open, disabled } = useContext(AccordionItemContext)
  const { toggleItem, collapsible } = useContext(AccordionRootContext)
  const [pressed, setPressed] = useState(false)
  // A caller's `disabled` wins over the item fold — the resolution the web leg
  // mirrors onto the DOM property, and the one the host itself lands on, since
  // its `disabled={disabled}` is spread before `frameProps`.
  const effectiveDisabled = frameProps.disabled ?? disabled
  const handlePress = useCallback<NonNullable<FlexCompatProps['onPress']>>(
    (event) => {
      // Belt over the host's press-lane detach: a host that ever dispatched
      // while disabled must still not toggle.
      if (effectiveDisabled) {
        return
      }
      onPress?.(event)
      toggleItem(value)
    },
    [effectiveDisabled, onPress, toggleItem, value],
  )
  const handlePressIn = useCallback<NonNullable<FlexCompatProps['onPressIn']>>(
    (event) => {
      // Same belt as handlePress: no pressed-background feedback while disabled.
      if (effectiveDisabled) {
        return
      }
      setPressed(true)
      onPressIn?.(event)
    },
    [effectiveDisabled, onPressIn],
  )
  const handlePressOut = useCallback<NonNullable<FlexCompatProps['onPressOut']>>(
    (event) => {
      setPressed(false)
      onPressOut?.(event)
    },
    [onPressOut],
  )
  // The same per-property pseudo merge the web leg carries (Tamagui folds a
  // caller's `pressStyle` into the frame's, measured in the parity matrix):
  // the caller's entries win over the swap while pressed.
  const pressedStyle: FlexCompatProps = pressed
    ? { backgroundColor: NATIVE_TRIGGER_PRESSED_BACKGROUND, ...pressStyle }
    : {}
  // The legacy aria surface, verbatim: `aria-expanded` from Collapsible.Trigger
  // and the open-and-not-collapsible `aria-disabled` from AccordionTrigger —
  // RN folds both into accessibilityState. Legacy sets no accessibilityRole on
  // native (`tag: 'button'` is web-only), so none is added here (ledgered).
  return (
    <FlexCompat
      {...NATIVE_TRIGGER_FRAME_DEFAULTS}
      disabled={disabled}
      aria-expanded={open}
      aria-disabled={(open && !collapsible) || undefined}
      {...frameProps}
      {...pressedStyle}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {typeof children === 'function' ? children({ open }) : children}
    </FlexCompat>
  )
}

function AccordionContent(props: AccordionContentCompatProps): JSX.Element | null {
  const { forceMount, children, ...frameProps } = props
  const { open } = useContext(AccordionItemContext)
  if (!forceMount && !open) {
    return null
  }
  return (
    <FlexCompat {...CONTENT_FRAME_DEFAULTS} {...frameProps}>
      {children}
    </FlexCompat>
  )
}

export const AccordionCompat: AccordionCompatComponent = Object.assign(AccordionRoot, {
  Item: AccordionItem,
  Header: AccordionHeader,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
  HeightAnimator: AccordionHeightAnimatorCompat,
})
markMyceliumPrimitive(AccordionCompat)

export type {
  AccordionCompatComponent,
  AccordionCompatProps,
  AccordionContentCompatProps,
  AccordionHeaderCompatProps,
  AccordionHeightAnimatorCompatProps,
  AccordionItemCompatProps,
  AccordionTriggerCompatProps,
} from './props'
