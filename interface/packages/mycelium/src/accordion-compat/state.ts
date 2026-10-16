/**
 * The shared Accordion value machine and contexts — one source of truth for
 * the `{ open }` render prop, Content presence, and HeightAnimator: on web the
 * transitions are computed by Radix (controlled, mirrored here), on native by
 * `toggleItem`, with legacy `@tamagui/accordion` semantics.
 */
import { createContext, useCallback, useContext, useId, useMemo, useState } from 'react'
import type { AccordionValuePropsLoose } from './props'

export interface AccordionRootContextValue {
  /** Values of the currently open items. */
  openValues: readonly string[]
  /** Apply one trigger activation (the legacy onItemOpen/onItemClose pair). */
  toggleItem: (itemValue: string) => void
  /** Web-leg hook-in: replace the whole value (Radix hands the computed next value). */
  setValue: (next: string | string[]) => void
  /** Root-level disable, folded into every item (legacy `accordionContext.disabled || props.disabled`). */
  disabled: boolean
  /** Resolved collapsibility (multiple is always collapsible) — the legacy trigger aria-disabled input. */
  collapsible: boolean
}

export const AccordionRootContext = createContext<AccordionRootContextValue>({
  openValues: [],
  toggleItem: () => {},
  setValue: () => {},
  disabled: false,
  collapsible: false,
})

export interface AccordionItemContextValue {
  value: string
  open: boolean
  disabled: boolean
  /** DOM ids pairing trigger and content (`aria-controls`/`aria-labelledby`); web-only attributes. */
  triggerId: string
  contentId: string
}

export const AccordionItemContext = createContext<AccordionItemContextValue>({
  value: '',
  open: false,
  disabled: false,
  triggerId: '',
  contentId: '',
})

/**
 * The per-item context computation both legs share: open resolution, the
 * legacy disabled fold (`accordionContext.disabled || props.disabled`), and
 * the trigger/content id pair. Rendering stays per-leg (web wraps Radix Item).
 */
export function useAccordionItemContextValue(value: string, disabled: boolean | undefined): AccordionItemContextValue {
  const { openValues, disabled: rootDisabled } = useContext(AccordionRootContext)
  const triggerId = useId()
  const contentId = useId()
  const open = openValues.includes(value)
  const itemDisabled = rootDisabled || (disabled ?? false)
  return useMemo(
    () => ({ value, open, disabled: itemDisabled, triggerId, contentId }),
    [value, open, itemDisabled, triggerId, contentId],
  )
}

function toOpenValues(value: string | string[] | undefined): readonly string[] {
  if (value === undefined || value === '') {
    return []
  }
  return typeof value === 'string' ? [value] : value
}

/** Controlled-or-uncontrolled value state (the legacy `useControllableState` shape). */
export function useAccordionValueState(props: AccordionValuePropsLoose): AccordionRootContextValue {
  const { type, disabled, value: valueProp, defaultValue, onValueChange } = props
  const collapsible = type === 'multiple' ? true : (props.collapsible ?? false)
  const [internalValue, setInternalValue] = useState<string | string[]>(
    () => defaultValue ?? (type === 'multiple' ? [] : ''),
  )
  const currentValue = valueProp ?? internalValue
  const openValues = useMemo(() => toOpenValues(currentValue), [currentValue])

  const setValue = useCallback(
    (next: string | string[]): void => {
      if (valueProp === undefined) {
        setInternalValue(next)
      }
      // Single always receives a string and multiple an array (the public
      // discriminated union), so the handler-union widening is sound.
      ;(onValueChange as ((value: string | string[]) => void) | undefined)?.(next)
    },
    [valueProp, onValueChange],
  )

  const toggleItem = useCallback(
    (itemValue: string): void => {
      if (type === 'multiple') {
        const open = openValues.includes(itemValue)
        setValue(open ? openValues.filter((value) => value !== itemValue) : [...openValues, itemValue])
        return
      }
      const open = openValues.includes(itemValue)
      if (!open) {
        setValue(itemValue)
      } else if (collapsible) {
        setValue('')
      }
    },
    [type, collapsible, openValues, setValue],
  )

  return useMemo(
    () => ({ openValues, toggleItem, setValue, disabled: disabled ?? false, collapsible }),
    [openValues, toggleItem, setValue, disabled, collapsible],
  )
}
