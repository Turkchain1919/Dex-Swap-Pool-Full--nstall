/**
 * Runtime helpers for the Tamagui-free Input rebuild (INFRA-3318): $sm/$md breakpoint
 * hooks and the one-time ::placeholder/::selection rule injection used by ./Input.tsx.
 */
import { isWebPlatform } from '@universe/environment'
import { useSyncExternalStore } from 'react'
import { type TextInputProps as RNTextInputProps, useWindowDimensions } from 'react-native'
import { breakpoints } from 'ui/src/theme'

// --- $sm / $md breakpoints: the exact media queries Tamagui compiled them to (web),
// dimension-driven on native, mirroring @tamagui/react-native-media-driver.

// Non-browser environments (SSR, node-env test DOMs) have no matchMedia; treat them as
// "not matching", which is also the server snapshot (Separator/Image rebuild pattern).
function canMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
}

function getServerSnapshot(): boolean {
  return false
}

function makeMaxWidthHook(maxWidth: number): () => boolean {
  const query = `(max-width: ${maxWidth}px)`
  const subscribe = (onChange: () => void): (() => void) => {
    if (!canMatchMedia()) {
      return () => {}
    }
    const mql = window.matchMedia(query)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }
  const getSnapshot = (): boolean => canMatchMedia() && window.matchMedia(query).matches
  const useWebHook = (): boolean => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const useNativeHook = (): boolean => {
    const { width } = useWindowDimensions()
    return width <= maxWidth
  }
  return isWebPlatform ? useWebHook : useNativeHook
}

export const useIsSmBreakpoint = makeMaxWidthHook(breakpoints.sm)
export const useIsMdBreakpoint = makeMaxWidthHook(breakpoints.md)

// --- ::placeholder / ::selection can't be inline styles. Inject two static attribute-keyed
// rules once and deliver the per-instance colors through CSS custom properties set inline.
// This is runtime style delivery for pseudo-elements, not statically-scanned class emission.

export function ensurePseudoRules(): void {
  if (typeof document === 'undefined') {
    return
  }
  // Minimal DOM environments (extension test harnesses) may lack document.head despite the
  // lib types claiming otherwise — hence the widened casts.
  const parent =
    (document.head as HTMLHeadElement | undefined) ??
    (document.body as HTMLElement | undefined) ??
    (document.documentElement as HTMLElement | undefined)
  if (parent === undefined) {
    return
  }
  // The DOM marker is the single dedupe: it holds across split-bundle module copies and
  // resets with the document, so test suites that clear <head> get the rules re-injected.
  if (document.querySelector('style[data-uds-input-pseudo]') !== null) {
    return
  }
  const el = document.createElement('style')
  el.setAttribute('data-uds-input-pseudo', '')
  // opacity:1 matches the legacy RNW placeholder rule (Firefox dims placeholders by default).
  el.textContent =
    '[data-uds-placeholder]::placeholder{color:var(--uds-input-placeholder);opacity:1;}' +
    '[data-uds-selection]::selection{background-color:var(--uds-input-selection);}'
  parent.appendChild(el)
}

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
