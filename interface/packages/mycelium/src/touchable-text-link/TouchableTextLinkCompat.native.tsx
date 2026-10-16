/**
 * Native leg of the `TouchableTextLink` compat (INFRA-3487): the same
 * structure over the compat primitives' native legs — a real `Pressable`
 * frame (`TouchableAreaCompat.native`) around the RN `Text`
 * (`TextCompat.native`), or, with `onlyUseText`, a pressable RN `Text`
 * wrapper so inline links keep their text flow.
 *
 * Legacy behavior on device, mirrored deliberately:
 * - pressing opens the URL in the device browser via `Linking.openURL`,
 *   logging (never throwing) on failure — the legacy `isMobileApp` branch;
 * - no hover/focus pools — the legacy pseudo pools are web-only, so the
 *   hovered-token swap and the focus underline never render on device;
 * - `target` and `noUnderline` are accepted so the shared prop contract is
 *   identical across legs, and unused exactly as legacy leaves them unused
 *   on device;
 * - `disabledStyle` forwards to the frame in the framed branch only (it never
 *   reaches the text on either leg); `forceStyle` reaches the text in both
 *   branches and additionally the frame in the framed branch; `display`
 *   reaches the text under `onlyUseText` and the frame in the framed branch —
 *   matching the web leg's contract exactly (same props, same destinations).
 *   Their actual effect on device is the pre-existing, pinned
 *   TouchableAreaCompat.native / nativeCompatProps gap (INFRA-2353): style
 *   resolution for the compiled className is still landing on Metro, and
 *   `disabledStyle`'s `aria-disabled:`-scoped classes specifically do not
 *   resolve natively — that gap is documented at the primitive level, not
 *   re-derived here.
 */
import { createConsoleLogger } from '@universe/logger'
import * as React from 'react'
import { type GestureResponderEvent, Linking, Text } from 'react-native'
import { useEvent } from 'utilities/src/react/hooks'
import { TextCompat } from '../text-compat/TextCompat'
import { TouchableAreaCompat } from '../touchable-area/TouchableAreaCompat'
import { DEFAULT_LINK_COLOR, DEFAULT_LINK_VARIANT, type TouchableTextLinkProps } from './props'
import { linkTextColor } from './resolve'

const logger = createConsoleLogger('TouchableTextLink')

export const TouchableTextLinkCompat = React.forwardRef<Text, TouchableTextLinkProps>(
  function TouchableTextLinkCompat(props, ref) {
    const {
      children,
      variant = DEFAULT_LINK_VARIANT,
      color = DEFAULT_LINK_COLOR,
      link,
      onPress,
      target: _target,
      disabled,
      disabledStyle,
      forceStyle,
      onlyUseText,
      noUnderline: _noUnderline,
      display,
      ...textProps
    } = props

    // The shared contract types the press family with DOM events; on native
    // the same handlers receive gesture-responder events, exactly like the
    // legacy component's RN typing (the TouchableAreaCompat.native mechanism).
    const handlePressWithLink = useEvent((event: GestureResponderEvent): void => {
      ;(onPress as ((pressEvent: GestureResponderEvent) => void) | null | undefined)?.(event)
      Linking.openURL(link).catch((error: unknown) => {
        logger.error('failed to open link', error, { link })
      })
    })

    const text = (
      <TextCompat
        // tsc resolves only TextCompat's platformless base (web) leg —
        // `moduleSuffixes` is configured nowhere — so the RN Text ref crosses
        // the leg boundary with a cast; at runtime Metro resolves
        // TextCompat.native, whose ref IS an RN Text (platform-legs.test.ts).
        ref={ref as unknown as React.Ref<HTMLElement>}
        // Mirrors the web leg exactly: `display` reaches the text only under
        // `onlyUseText` (no frame to carry it there); the framed branch below
        // forwards it to the frame instead.
        display={onlyUseText === true ? display : undefined}
        disabled={disabled}
        textDecorationLine="none"
        variant={variant}
        color={linkTextColor(color, disabled)}
        forceStyle={forceStyle}
        role="link"
        {...textProps}
      >
        {children}
      </TextCompat>
    )

    if (onlyUseText === true) {
      // RN's pressable-inline-text mechanism: `onPress` must sit on an RN
      // `Text` (a Pressable is a View and would break the surrounding text
      // flow); nesting keeps TextCompat's own styling on the content.
      return (
        <Text
          accessibilityState={disabled === true ? { disabled: true } : undefined}
          suppressHighlighting
          onPress={disabled === true ? undefined : handlePressWithLink}
        >
          {text}
        </Text>
      )
    }

    return (
      <TouchableAreaCompat
        variant="unstyled"
        // The legacy frame's press feedback is neutralized (unstyled scale 1,
        // no press opacity); propagation gating and color injection are off
        // because legacy renders the bare frame, not the TouchableArea wrapper.
        scaleTo={1}
        activeOpacity={0}
        shouldStopPropagation={false}
        shouldAutomaticallyInjectColors={false}
        disabled={disabled}
        disabledStyle={disabledStyle}
        forceStyle={forceStyle}
        display={display}
        onPress={handlePressWithLink}
      >
        {text}
      </TouchableAreaCompat>
    )
  },
)
