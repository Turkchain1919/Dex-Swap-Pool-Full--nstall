/* Deliberately Tamagui-free (INFRA-3318): the web Input leg emits the legacy Tamagui Input
 * cascade via inline styles on a raw <input>/<textarea>, transcribing RNW's TextInput
 * behaviors (nativeEvent.text, Enter-key guards, selection surface, TextInputState). */
import {
  type ChangeEvent,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  forwardRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
  useRef,
} from 'react'
import type { TextInput as RNTextInput } from 'react-native'
import {
  ensurePseudoRules,
  resolveWebInputType,
  RN_ONLY_PROP_KEYS,
  type RnOnlyPropKey,
} from 'ui/src/components/input/inputRuntime'
import { registerFocusedInput, unregisterFocusedInput } from 'ui/src/components/input/rnwTextInputState'
import { useInputVisualState } from 'ui/src/components/input/shared'
import type { InputForwardProps, InputProps } from 'ui/src/components/input/types'
import {
  createInputKeyDownHandler,
  createInputSelectHandler,
  matchesFocusVisible,
  useAppliedSelection,
  useOnLayout,
} from 'ui/src/components/input/useWebInputImperative'

export type { InputProps, InputStyleProps } from 'ui/src/components/input/types'

/** Instance type alias kept for consumers doing `forwardRef<Input>` (Tamagui exported the same alias). */
export type Input = RNTextInput

/** RN-surface keys the web leg consumes and maps to DOM behavior below. */
type HandledWebPropKey =
  | 'value'
  | 'defaultValue'
  | 'placeholder'
  | 'onChangeText'
  | 'onChange'
  | 'onSubmitEditing'
  | 'onKeyPress'
  | 'keyboardType'
  | 'inputMode'
  | 'secureTextEntry'
  | 'maxLength'
  | 'autoFocus'
  | 'autoComplete'
  | 'autoCapitalize'
  | 'autoCorrect'
  | 'returnKeyType'
  | 'multiline'
  | 'numberOfLines'
  | 'rows'
  | 'accessibilityLabel'
  | 'onPressIn'
  | 'onPressOut'
  | 'spellCheck'
  | 'blurOnSubmit'
  | 'selection'
  | 'onSelectionChange'
  | 'selectTextOnFocus'
  | 'clearTextOnFocus'
  | 'caretHidden'
  | 'onLayout'
  | 'pointerEvents'

/**
 * RNTextInputProps keys that are legitimate DOM props as-is (React DOM understands them),
 * so the passthrough forwards them verbatim.
 */
type DomSafePassthroughKey = Extract<
  keyof InputForwardProps,
  | 'id'
  | 'role'
  | 'tabIndex'
  | `aria-${string}`
  | `onPointer${string}`
  | `onTouch${string}`
  | 'onClick'
  | 'onMouseEnter'
  | 'onMouseLeave'
  | 'enterKeyHint'
  | 'readOnly'
  | 'children'
>

// Compile-time routing guard (the inverse of RN_ONLY_PROP_KEYS' membership pin): every key of
// the forwarded RNTextInputProps surface must be consumed above, filtered as RN-only, or be a
// legitimate DOM prop — an RN upgrade that adds a new TextInput prop fails here instead of
// silently leaking an unknown attribute onto the DOM element.
type UnroutedWebPropKey = Exclude<keyof InputForwardProps, HandledWebPropKey | RnOnlyPropKey | DomSafePassthroughKey>
type AssertWebPropSurfaceRouted = UnroutedWebPropKey extends never ? true : ['unrouted keys:', UnroutedWebPropKey]
const _webPropSurfaceRouted: AssertWebPropSurfaceRouted = true

/**
 * Text input, rebuilt off Tamagui under the same `Input` export (INFRA-3318). Web leg: a raw
 * <input>/<textarea> with inline styles transcribing the legacy Tamagui cascade and the RN
 * prop surface mapped by hand, the way the legacy engine rendered an <input> tag. Focus/hover
 * visual states drive the enumerated focusStyle/hoverStyle surface.
 */
export const Input = forwardRef<RNTextInput, InputProps>(function InputComponent(props, ref): JSX.Element {
  const {
    forwardProps,
    resolvedStyle,
    isEditable,
    placeholderColor,
    selectionColor,
    hasGroupHover,
    dataTestId,
    onFocus,
    onBlur,
    setFocused,
    setFocusVisible,
    setHovered,
    setGroupHovered,
  } = useInputVisualState(props)

  const {
    value,
    defaultValue,
    placeholder,
    onChangeText,
    onChange,
    onSubmitEditing,
    onKeyPress,
    keyboardType,
    inputMode,
    secureTextEntry,
    maxLength,
    autoFocus,
    autoComplete,
    autoCapitalize,
    autoCorrect,
    returnKeyType,
    multiline,
    numberOfLines,
    rows,
    accessibilityLabel,
    onPressIn,
    onPressOut,
    spellCheck,
    blurOnSubmit,
    selection,
    onSelectionChange,
    selectTextOnFocus,
    clearTextOnFocus,
    caretHidden,
    onLayout,
    pointerEvents,
    ...typedDomRest
  } = forwardProps

  const domRest = typedDomRest as Record<string, unknown>
  for (const key of RN_ONLY_PROP_KEYS) {
    delete domRest[key]
  }
  // Parity: the legacy engine never forwarded `pattern` (SendRecipientForm passes one, type-suppressed)
  // — keep dropping it so HTML5 constraint validation doesn't go live unannounced.
  delete domRest['pattern']

  if (pointerEvents === 'auto' || pointerEvents === 'none') {
    resolvedStyle['pointerEvents'] = pointerEvents
  }

  const elementRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  useEffect(ensurePseudoRules, [])

  // Best-effort `$group-hover`: track hover on the nearest Tamagui group ancestor.
  useEffect(() => {
    if (!hasGroupHover) {
      return undefined
    }
    const el = elementRef.current
    const group = el?.closest('[class*="t_group"]')
    if (group === null || group === undefined) {
      return undefined
    }
    const onEnter = (): void => setGroupHovered(true)
    const onLeave = (): void => setGroupHovered(false)
    group.addEventListener('mouseenter', onEnter)
    group.addEventListener('mouseleave', onLeave)
    return () => {
      group.removeEventListener('mouseenter', onEnter)
      group.removeEventListener('mouseleave', onLeave)
    }
  }, [hasGroupHover, setGroupHovered])

  useAppliedSelection({
    elementRef,
    start: selection?.start,
    end: selection?.end,
    value,
  })
  useOnLayout({ elementRef, onLayout: onLayout as ((e: unknown) => void) | undefined })

  const setRefs = (node: HTMLInputElement | HTMLTextAreaElement | null): void => {
    elementRef.current = node
    // Consumers hold the ref RNW/Tamagui exposed on web: the DOM element augmented with the
    // TextInput methods RNW attached to the host node (SearchTextInput calls .clear()).
    // RNW also attached measure()/measureLayout()/measureInWindow() — not transcribed: no
    // Input call site uses them on web; add here if one ever does.
    if (node !== null) {
      const augmented = node as typeof node & { clear?: () => void; isFocused?: () => boolean }
      augmented.clear = (): void => {
        node.value = ''
      }
      augmented.isFocused = (): boolean => node.ownerDocument.activeElement === node
    }
    if (typeof ref === 'function') {
      ref(node as unknown as RNTextInput)
    } else if (ref !== null) {
      ref.current = node as unknown as RNTextInput
    }
  }

  const style: CSSProperties & Record<string, unknown> = {
    // RNW/Tamagui input frame resets the UA stylesheet before the cascade lands.
    boxSizing: 'border-box',
    margin: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    borderWidth: 0,
    borderStyle: 'solid',
    appearance: 'none',
    MozAppearance: 'textfield',
    resize: 'none',
    ...(resolvedStyle as CSSProperties),
  }
  if (typeof style.lineHeight === 'number') {
    // Numeric lineHeight can still arrive via the RN `style` prop (styled() wrappers,
    // consumer styles); React would emit it unitless, the legacy cascade emitted px.
    style.lineHeight = `${style.lineHeight}px`
  }
  if (placeholderColor !== undefined) {
    style['--uds-input-placeholder'] = placeholderColor
  }
  if (selectionColor !== undefined) {
    style['--uds-input-selection'] = selectionColor
    style.caretColor = selectionColor
  }
  if (caretHidden === true) {
    // RNW mapped caretHidden to a transparent caret, over any selectionColor caret.
    style.caretColor = 'transparent'
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const text = e.currentTarget.value
    // RNW delivered DOM events with nativeEvent.text populated; RN-shaped consumers (the
    // extension's seed-phrase import among them) read the new value from there, not target.value.
    ;(e.nativeEvent as Event & { text?: string }).text = text
    onChangeText?.(text)
    ;(onChange as ((event: unknown) => void) | undefined)?.(e)
  }

  const handleKeyDown = createInputKeyDownHandler({
    onKeyPress: onKeyPress as ((e: unknown) => void) | undefined,
    onSubmitEditing: onSubmitEditing as ((e: unknown) => void) | undefined,
    blurOnSubmit,
    multiline,
  })

  const handleFocus = (e: ReactFocusEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const node = e.currentTarget
    setFocused(true)
    setFocusVisible(matchesFocusVisible(node))
    // RNW registered the focused host node so Keyboard.dismiss()/blurTextInput can find it.
    registerFocusedInput(node)
    ;(e.nativeEvent as Event & { text?: string }).text = node.value
    ;(onFocus as ((event: unknown) => void) | undefined)?.(e)
    if (clearTextOnFocus === true) {
      node.value = ''
    }
    if (selectTextOnFocus === true) {
      // RNW deferred the select for Safari, re-checking focus before selecting.
      setTimeout(() => {
        if (node.ownerDocument.activeElement === node) {
          node.select()
        }
      }, 0)
    }
  }
  const handleBlur = (e: ReactFocusEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    setFocused(false)
    setFocusVisible(false)
    unregisterFocusedInput()
    ;(e.nativeEvent as Event & { text?: string }).text = e.currentTarget.value
    ;(onBlur as ((event: unknown) => void) | undefined)?.(e)
  }
  const handleSelect = createInputSelectHandler(onSelectionChange as ((e: unknown) => void) | undefined)

  // Chain, don't clobber: Tamagui styled(Input) wrappers deliver their own
  // onMouseEnter/onMouseLeave through the passthrough (their hoverStyle runtime), and
  // consumers can pass them directly — both must keep firing alongside our hover state.
  const passthroughMouseEnter = domRest['onMouseEnter'] as ((e: unknown) => void) | undefined
  const passthroughMouseLeave = domRest['onMouseLeave'] as ((e: unknown) => void) | undefined
  const handleMouseEnter = (e: unknown): void => {
    setHovered(true)
    passthroughMouseEnter?.(e)
  }
  const handleMouseLeave = (e: unknown): void => {
    setHovered(false)
    passthroughMouseLeave?.(e)
  }
  // RN press events, delivered the way RNW mapped them on web.
  const handleMouseDown = (e: unknown): void => {
    ;(onPressIn as ((event: unknown) => void) | undefined)?.(e)
  }
  const handleMouseUp = (e: unknown): void => {
    ;(onPressOut as ((event: unknown) => void) | undefined)?.(e)
  }

  const sharedDomProps = {
    // The legacy RNW-rendered input always carried dir="auto".
    dir: 'auto',
    // RNW set this unconditionally on every TextInput (index.js:429); it keeps the Android
    // mobile-web virtual keyboard from resizing the layout viewport (WEB-5798).
    virtualkeyboardpolicy: 'auto',
    ...domRest,
    ref: setRefs,
    style,
    value,
    defaultValue,
    placeholder,
    maxLength,
    autoFocus,
    autoComplete: autoComplete as string | undefined,
    autoCapitalize,
    autoCorrect: autoCorrect === undefined ? undefined : autoCorrect === true ? 'on' : 'off',
    // RNW derived spellCheck from autoCorrect, so autoCorrect={false} fields (seed phrases,
    // passwords) never leak contents to browser spellcheck services.
    spellCheck: spellCheck ?? autoCorrect,
    // Legacy contract: disabled → readOnly (never the DOM disabled attribute), and a
    // consumer-passed DOM readOnly in the passthrough is not clobbered.
    readOnly: !isEditable || domRest['readOnly'] === true,
    'data-testid': dataTestId,
    'data-uds-placeholder': placeholderColor === undefined ? undefined : '',
    'data-uds-selection': selectionColor === undefined ? undefined : '',
    // Conditional spreads: a consumer-passed aria-label/enterKeyHint/onMouseDown/onMouseUp
    // in domRest must not be clobbered with undefined.
    ...(accessibilityLabel === undefined ? undefined : { 'aria-label': accessibilityLabel as string }),
    ...(returnKeyType === undefined
      ? undefined
      : { enterKeyHint: returnKeyType as InputHTMLAttributes<HTMLInputElement>['enterKeyHint'] }),
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    ...(onPressIn === undefined ? undefined : { onMouseDown: handleMouseDown }),
    ...(onPressOut === undefined ? undefined : { onMouseUp: handleMouseUp }),
    ...(onSelectionChange === undefined ? undefined : { onSelect: handleSelect }),
  }

  // RNW parity: only `multiline` switches to <textarea> (numberOfLines alone never did), and
  // multiline wins over secureTextEntry — RNW rendered the same unmasked textarea there.
  if (multiline === true) {
    return (
      <textarea {...(sharedDomProps as TextareaHTMLAttributes<HTMLTextAreaElement>)} rows={rows ?? numberOfLines} />
    )
  }

  const derived = resolveWebInputType({ inputMode, keyboardType, secureTextEntry })

  return (
    <input
      {...(sharedDomProps as InputHTMLAttributes<HTMLInputElement>)}
      type={derived.type}
      inputMode={derived.inputMode as InputHTMLAttributes<HTMLInputElement>['inputMode']}
    />
  )
})

Input.displayName = 'Input'
