import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { useCallback, useContext } from 'react'
import type { JSX, Ref } from 'react'
import { markMyceliumPrimitive } from '../compat/primitive-marker'
import { FlexCompat } from '../flex-compat/FlexCompat'
import type { FlexCompatProps } from '../flex-compat/props'
import { TextCompat } from '../text-compat/TextCompat.web'
import { CONTENT_FRAME_DEFAULTS, TRIGGER_FRAME_DEFAULTS } from './frame-defaults'
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
 * Web drop-in replacement for the `ui/src` Tamagui `Accordion`, wrapping
 * `@radix-ui/react-accordion` — the machine `@tamagui/accordion` was ported
 * from — for the value semantics, trigger toggle wiring, and roving focus.
 * Parts host on compat Flex/Text via Radix `asChild`, frame defaults before
 * caller props so overrides resolve as under Tamagui.
 *
 * `Content` is deliberately NOT Radix's: legacy content mounts/unmounts
 * synchronously and stays VISIBLE under `forceMount` while closed, where
 * Radix hides it. The `components/accordion.tsx` shadcn layer is not reused
 * either — each of its parts injects styling the legacy surface does not have
 * (root `w-full`, trigger chevron + `py-4`, content animation + `pb-4`).
 */
function AccordionRoot(props: AccordionCompatProps): JSX.Element {
  const { type, collapsible, disabled, value, defaultValue, onValueChange, children, ...frameProps } = props as Omit<
    FlexCompatProps,
    'onValueChange'
  > &
    AccordionValuePropsLoose
  const state = useAccordionValueState({ type, collapsible, disabled, value, defaultValue, onValueChange })

  // Radix computes each transition (trigger toggle, collapsible close) and
  // hands the next value back through the controlled pair; the shared context
  // mirrors it for the render prop, Content, and HeightAnimator.
  const radixValueProps =
    type === 'multiple'
      ? { type: 'multiple' as const, value: [...state.openValues], onValueChange: state.setValue }
      : {
          type: 'single' as const,
          collapsible: collapsible ?? false,
          value: state.openValues[0] ?? '',
          onValueChange: state.setValue,
        }

  return (
    <AccordionRootContext.Provider value={state}>
      <AccordionPrimitive.Root disabled={disabled} {...radixValueProps} asChild>
        <FlexCompat flexDirection="column" {...frameProps}>
          {children}
        </FlexCompat>
      </AccordionPrimitive.Root>
    </AccordionRootContext.Provider>
  )
}

function AccordionItem(props: AccordionItemCompatProps): JSX.Element {
  const { value, disabled, children, ...frameProps } = props
  const itemContext = useAccordionItemContextValue(value, disabled)
  return (
    <AccordionItemContext.Provider value={itemContext}>
      <AccordionPrimitive.Item value={value} disabled={disabled} asChild>
        <FlexCompat {...frameProps}>{children}</FlexCompat>
      </AccordionPrimitive.Item>
    </AccordionItemContext.Provider>
  )
}

function AccordionHeader(props: AccordionHeaderCompatProps): JSX.Element {
  const { children, ...frameProps } = props
  // A text host, not a Flex: the legacy Header is a Tamagui `H1` text frame.
  // Radix's Header supplies the data attribute triple (same set, same
  // caller-wins order as legacy); its `h3` never renders under `asChild`.
  return (
    <AccordionPrimitive.Header asChild>
      <TextCompat tag="h1" {...frameProps}>
        {children}
      </TextCompat>
    </AccordionPrimitive.Header>
  )
}

function AccordionTrigger(props: AccordionTriggerCompatProps): JSX.Element {
  const {
    children,
    ref: forwardedRef,
    ...frameProps
  } = props as AccordionTriggerCompatProps & { ref?: Ref<HTMLElement> }
  const { open, disabled, triggerId, contentId } = useContext(AccordionItemContext)
  // Legacy renders the literal `disabled` attribute, and Radix's roving-focus
  // collection filters triggers on the DOM `disabled` PROPERTY
  // (@radix-ui/react-accordion dist: `!item.ref.current?.disabled`); the compat
  // DOM layer expresses `disabled` as aria-disabled only, so mirror the
  // property here or a disabled trigger stays focusable and in the Arrow/Home/
  // End rotation. Caller override wins, matching legacy's spread order, and a
  // caller ref composes with the mirror instead of displacing it.
  const effectiveDisabled = frameProps.disabled ?? disabled
  const composedTriggerRef = useCallback(
    (node: HTMLElement | null): void => {
      if (node instanceof HTMLButtonElement) {
        node.disabled = effectiveDisabled
      }
      if (typeof forwardedRef === 'function') {
        forwardedRef(node)
      } else if (forwardedRef) {
        ;(forwardedRef as { current: HTMLElement | null }).current = node
      }
    },
    [effectiveDisabled, forwardedRef],
  )
  // Tamagui merges a caller's pseudo-style object into the frame's PER
  // PROPERTY (measured in the parity matrix: a caller `hoverStyle` keeps the
  // frame's `$backgroundHover`), so the wholesale spread replacement the
  // JSX order gives cannot stand in for the pseudo props.
  const mergedPseudoStyles: FlexCompatProps = {
    hoverStyle: { ...TRIGGER_FRAME_DEFAULTS.hoverStyle, ...frameProps.hoverStyle },
    pressStyle: { ...TRIGGER_FRAME_DEFAULTS.pressStyle, ...frameProps.pressStyle },
    focusStyle: { ...TRIGGER_FRAME_DEFAULTS.focusStyle, ...frameProps.focusStyle },
  }
  return (
    <AccordionPrimitive.Trigger id={triggerId} aria-controls={contentId} asChild>
      <FlexCompat
        ref={composedTriggerRef}
        tag="button"
        {...TRIGGER_FRAME_DEFAULTS}
        {...frameProps}
        {...mergedPseudoStyles}
      >
        {typeof children === 'function' ? children({ open }) : children}
      </FlexCompat>
    </AccordionPrimitive.Trigger>
  )
}

function AccordionContent(props: AccordionContentCompatProps): JSX.Element | null {
  const { forceMount, children, ...frameProps } = props
  const { open, triggerId, contentId } = useContext(AccordionItemContext)
  if (!forceMount && !open) {
    return null
  }
  return (
    <FlexCompat
      role="region"
      id={contentId}
      aria-labelledby={triggerId}
      data-orientation="vertical"
      {...CONTENT_FRAME_DEFAULTS}
      {...frameProps}
    >
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
