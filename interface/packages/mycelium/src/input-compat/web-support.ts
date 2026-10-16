/**
 * Web-leg-only runtime helpers for the Input compat (ported from the ui/src
 * INFRA-3318 rebuild): the RNW inputMode/keyboardType → DOM `type`/`inputMode`
 * derivation, plus the RN-only prop strip list. DOM code — imported only from
 * InputCompat.web.tsx. (Pseudo-element rule injection lives in
 * useEnsurePseudoRules.ts.)
 */
import type { TextInputProps as RNTextInputProps } from 'react-native'

/**
 * RNW's inputMode/keyboardType → DOM `type`/`inputMode` derivation, transcribed verbatim:
 * an explicit inputMode wins and derives the type; keyboardType maps email-address→email,
 * phone-pad→tel, search/web-search→search, url→url, numeric family→inputMode only (no type
 * attribute); secureTextEntry forces password. With neither prop, no type attribute is
 * emitted — exactly what the legacy engine rendered.
 */
export function resolveWebInputType({
  inputMode,
  keyboardType,
  secureTextEntry,
}: {
  inputMode?: string
  keyboardType?: string
  secureTextEntry?: boolean
}): { type?: string; inputMode?: string } {
  let type: string | undefined
  let mode: string | undefined
  if (inputMode !== undefined) {
    mode = inputMode
    if (inputMode === 'email' || inputMode === 'tel' || inputMode === 'search' || inputMode === 'url') {
      type = inputMode
    } else {
      type = 'text'
    }
  } else if (keyboardType !== undefined) {
    switch (keyboardType) {
      case 'email-address':
        type = 'email'
        break
      case 'number-pad':
      case 'numeric':
        mode = 'numeric'
        break
      case 'decimal-pad':
        mode = 'decimal'
        break
      case 'phone-pad':
        type = 'tel'
        break
      case 'search':
      case 'web-search':
        type = 'search'
        break
      case 'url':
        type = 'url'
        break
      default:
        type = 'text'
    }
  }
  if (secureTextEntry === true) {
    type = 'password'
  }
  return { type, inputMode: mode }
}

// RNTextInputProps surface (react-native 0.85, including the ViewProps it inherits) with no
// DOM equivalent — the handlers never fire on a raw <input> and React warns on the unknown
// attributes, so they must not reach the element. Pinned against RNTextInputProps so a typo
// or an RN upgrade that renames a key fails typecheck. selection/onSelectionChange/
// selectTextOnFocus/clearTextOnFocus/caretHidden/onLayout are NOT listed: the web leg
// implements them the way RNW did. No Input call site passes the accessibility* props today —
// they are stripped rather than aria-mapped; RNW-style role/aria-* mapping can be transcribed
// if a consumer ever needs it (accessibilityLabel is the exception: consumed and mapped to aria-label).
export const RN_ONLY_PROP_KEYS = [
  'accessibilityActions',
  'accessibilityElementsHidden',
  'accessibilityHint',
  'accessibilityIgnoresInvertColors',
  'accessibilityLabelledBy',
  'accessibilityLanguage',
  'accessibilityLargeContentTitle',
  'accessibilityLiveRegion',
  'accessibilityRespondsToUserInteraction',
  'accessibilityRole',
  'accessibilityShowsLargeContentViewer',
  'accessibilityState',
  'accessibilityValue',
  'accessibilityViewIsModal',
  'accessible',
  'allowFontScaling',
  'clearButtonMode',
  'collapsable',
  'collapsableChildren',
  'contextMenuHidden',
  'cursorColor',
  'dataDetectorTypes',
  'disableFullscreenUI',
  'disableKeyboardShortcuts',
  'enablesReturnKeyAutomatically',
  'focusable',
  'hasTVPreferredFocus',
  'hitSlop',
  'importantForAccessibility',
  'importantForAutofill',
  'inlineImageLeft',
  'inlineImagePadding',
  'inputAccessoryViewButtonLabel',
  'inputAccessoryViewID',
  'isTVSelectable',
  'keyboardAppearance',
  'lineBreakModeIOS',
  'lineBreakStrategyIOS',
  'maxFontSizeMultiplier',
  'nativeID',
  'needsOffscreenAlphaCompositing',
  'onAccessibilityAction',
  'onAccessibilityEscape',
  'onAccessibilityTap',
  'onContentSizeChange',
  'onEndEditing',
  'onMagicTap',
  'onMoveShouldSetResponder',
  'onMoveShouldSetResponderCapture',
  'onPress',
  'onResponderEnd',
  'onResponderGrant',
  'onResponderMove',
  'onResponderReject',
  'onResponderRelease',
  'onResponderStart',
  'onResponderTerminate',
  'onResponderTerminationRequest',
  'onScroll',
  'onStartShouldSetResponder',
  'onStartShouldSetResponderCapture',
  'passwordRules',
  'rejectResponderTermination',
  'removeClippedSubviews',
  'renderToHardwareTextureAndroid',
  'returnKeyLabel',
  'screenReaderFocusable',
  'scrollEnabled',
  'selectionHandleColor',
  'selectionState',
  'shouldRasterizeIOS',
  'showSoftInputOnFocus',
  'smartInsertDelete',
  'submitBehavior',
  'textAlignVertical',
  'textBreakStrategy',
  'textContentType',
  'tvParallaxMagnification',
  'tvParallaxShiftDistanceX',
  'tvParallaxShiftDistanceY',
  'tvParallaxTiltAngle',
  'underlineColorAndroid',
] as const satisfies ReadonlyArray<keyof RNTextInputProps>

export type RnOnlyPropKey = (typeof RN_ONLY_PROP_KEYS)[number]
