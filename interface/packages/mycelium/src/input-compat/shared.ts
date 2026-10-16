/**
 * Style/interaction assembly shared by both Input compat platform legs
 * (ported from the ui/src INFRA-3318 rebuild): resolves the legacy Tamagui
 * cascade (default frame → style props → $platform-web → RN `style` →
 * $md/$sm → groupHover/hover/focus/focusVisible) against the live theme and
 * owns the interactive visual state the legs feed from their platform events.
 */
import { isWebPlatform } from '@universe/environment'
import { useState } from 'react'
import type { TextInputProps as RNTextInputProps, TextStyle } from 'react-native'
import { useSporeColors } from '../theme-hooks-compat/useSporeColors'
import { useIsMdBreakpoint, useIsSmBreakpoint } from './breakpoints'
import { type InputCompatForwardProps, type InputCompatProps, omitStyleProps, pickStyleProps } from './props'
import { defaultFrame, resolveColor, resolveStyleProps, resolveTamaguiSpaceVars } from './resolve'

export type InputVisualState = {
  /** RN prop surface left for the platform element after the style layer is consumed. */
  forwardProps: InputCompatForwardProps
  resolvedStyle: Record<string, unknown>
  isEditable: boolean
  placeholderColor: string | undefined
  selectionColor: string | undefined
  hasGroupHover: boolean
  testID: string | undefined
  dataTestId: string | undefined
  onFocus: RNTextInputProps['onFocus']
  onBlur: RNTextInputProps['onBlur']
  setFocused: (value: boolean) => void
  setFocusVisible: (value: boolean) => void
  setHovered: (value: boolean) => void
  setGroupHovered: (value: boolean) => void
}

export function useInputVisualState(props: InputCompatProps): InputVisualState {
  const {
    unstyled = false,
    focusStyle,
    hoverStyle,
    focusVisibleStyle,
    groupHoverStyle,
    '$platform-web': platformWebStyle,
    $sm,
    $md,
    style,
    disabled,
    editable,
    placeholderTextColor,
    selectionColor,
    testID,
    'data-testid': dataTestId,
    onFocus,
    onBlur,
    ...restProps
  } = props

  const colors = useSporeColors()
  const isSm = useIsSmBreakpoint()
  const isMd = useIsMdBreakpoint()

  const [focused, setFocused] = useState(false)
  const [focusVisible, setFocusVisible] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [groupHovered, setGroupHovered] = useState(false)

  const styleProps = pickStyleProps(restProps as Record<string, unknown>)

  const smOverride = isSm ? $sm : undefined
  const mdOverride = isMd ? $md : undefined

  // Base layer, before any interactive/breakpoint override — checked below to decide
  // whether a bare `hoverStyle={{ opacity }}` needs a synthesized resting-state opacity.
  const baseStyle: Record<string, unknown> = {
    ...(unstyled ? {} : resolveStyleProps(colors, defaultFrame(colors))),
    ...resolveStyleProps(colors, styleProps),
    // $platform-web goes through the resolvers too, so tokens/shorthands never emit invalid CSS.
    ...(isWebPlatform ? resolveTamaguiSpaceVars(colors, platformWebStyle as TextStyle) : undefined),
  }

  // Legacy Tamagui auto-synthesizes a base `opacity: 1` whenever a component's
  // config declares a `hoverStyle` with no explicit base opacity, so hovering
  // back out has a defined revert value (INFRA-3824) — without it, a bare
  // `hoverStyle={{ opacity: 0.5 }}` leaves the resting-state opacity empty.
  if ((hoverStyle as TextStyle | undefined)?.['opacity'] !== undefined && baseStyle['opacity'] === undefined) {
    // Numeric, not a string: this lands directly in RN's TextStyle on the native leg,
    // whose `opacity` field rejects a string value — web serializes either form identically.
    baseStyle['opacity'] = 1
  }

  const resolvedStyle: Record<string, unknown> = {
    ...baseStyle,
    // Interactive pseudo layers resolve BEFORE the caller's `style` prop, so a
    // literal `style` value always wins on a collision (INFRA-3824) — legacy
    // Tamagui compiles pseudo styles to CSS classes, which lose to an inline
    // `style` attribute; this rebuild resolves hover/focus inline instead, so
    // ordering has to do that job explicitly.
    ...(groupHovered && groupHoverStyle !== undefined ? resolveStyleProps(colors, groupHoverStyle) : undefined),
    ...(hovered && hoverStyle !== undefined ? resolveStyleProps(colors, hoverStyle) : undefined),
    ...(focused && focusStyle !== undefined ? resolveStyleProps(colors, focusStyle) : undefined),
    ...(focusVisible && focusVisibleStyle !== undefined ? resolveStyleProps(colors, focusVisibleStyle) : undefined),
    // The RN `style` prop (how styled() wrappers deliver their config) beats every
    // pseudo layer above; the breakpoint pools below still beat `style` itself.
    ...resolveTamaguiSpaceVars(colors, style),
    // $md before $sm: the narrower breakpoint is the stronger override (legacy media order)
    ...(mdOverride !== undefined ? resolveStyleProps(colors, pickStyleProps(mdOverride)) : undefined),
    ...(mdOverride !== undefined && isWebPlatform
      ? resolveTamaguiSpaceVars(colors, mdOverride['$platform-web'] as TextStyle)
      : undefined),
    ...(smOverride !== undefined ? resolveStyleProps(colors, pickStyleProps(smOverride)) : undefined),
    ...(smOverride !== undefined && isWebPlatform
      ? resolveTamaguiSpaceVars(colors, smOverride['$platform-web'] as TextStyle)
      : undefined),
  }

  return {
    // Style-surface keys were already resolved into resolvedStyle — they must not reach the
    // platform element as unknown props/attributes.
    forwardProps: omitStyleProps(restProps as Record<string, unknown>) as InputCompatForwardProps,
    resolvedStyle,
    isEditable: editable !== false && disabled !== true,
    placeholderColor: resolveColor(colors, placeholderTextColor),
    selectionColor: resolveColor(colors, selectionColor),
    hasGroupHover: groupHoverStyle !== undefined,
    testID,
    dataTestId: dataTestId ?? testID,
    onFocus,
    onBlur,
    setFocused,
    setFocusVisible,
    setHovered,
    setGroupHovered,
  }
}
