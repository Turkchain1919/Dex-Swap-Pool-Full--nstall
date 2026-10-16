/** Shared prop types for the platform-split Input legs (./Input.web.tsx, ./Input.native.tsx). */
import type { CSSProperties } from 'react'
import type { StyleProp, TextInputProps as RNTextInputProps, TextStyle } from 'react-native'
import type { ColorTokenValue, InputStyleProps } from 'ui/src/components/input/inputStyleResolution'

export type { InputStyleProps } from 'ui/src/components/input/inputStyleResolution'

export type BreakpointOverride = InputStyleProps & { '$platform-web'?: CSSProperties }

export type InputProps = Omit<RNTextInputProps, 'style' | 'placeholderTextColor' | 'selectionColor' | 'verticalAlign'> &
  InputStyleProps & {
    placeholderTextColor?: ColorTokenValue
    selectionColor?: ColorTokenValue
    focusStyle?: InputStyleProps
    hoverStyle?: InputStyleProps
    focusVisibleStyle?: InputStyleProps
    /** Applied when the nearest Tamagui `group` ancestor is hovered (web only, best-effort). */
    groupHoverStyle?: InputStyleProps
    /** Web-only styles, matching the legacy `$platform-web` prop. */
    '$platform-web'?: CSSProperties
    /** Overrides at or below the `$sm` breakpoint (max-width 450px). */
    $sm?: BreakpointOverride
    /** Overrides at or below the `$md` breakpoint (max-width 640px). */
    $md?: BreakpointOverride
    /** Skip the legacy Input default frame, matching Tamagui's `unstyled` variant. */
    unstyled?: boolean
    disabled?: boolean
    'data-testid'?: string
    rows?: number
    style?: StyleProp<TextStyle>
  }

/**
 * The RN prop surface left after `useInputVisualState` consumes the style/interaction layer:
 * what each platform leg forwards to its underlying element. Typed from RNTextInputProps so
 * the web leg's destructure and its DOM-safety coverage assert stay pinned to the real
 * react-native surface.
 */
export type InputForwardProps = Omit<
  RNTextInputProps,
  | 'style'
  | 'placeholderTextColor'
  | 'selectionColor'
  | 'verticalAlign'
  | 'onFocus'
  | 'onBlur'
  | 'testID'
  | 'editable'
  | keyof InputStyleProps
> & { rows?: number }
