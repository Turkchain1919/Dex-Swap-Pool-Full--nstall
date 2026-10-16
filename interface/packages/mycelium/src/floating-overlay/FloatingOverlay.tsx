/**
 * Platform-split base stubs — bundlers resolve `FloatingOverlay.native` /
 * `FloatingOverlay.web` (the `ui/src` convention). The primitive is
 * native-first (INFRA-2965); the web leg intentionally stays a stub because
 * web floating overlays come from the Base UI menus family (INFRA-3021).
 */
import type { JSX } from 'react'
import type {
  FloatingOverlayAnchorProps,
  FloatingOverlayArrowProps,
  FloatingOverlayContentProps,
  FloatingOverlayProviderProps,
  FloatingOverlayRootProps,
  FloatingOverlayState,
} from './types'

function stub(name: string): never {
  throw new Error(`${name} not implemented. Did you forget a platform override?`)
}

export function FloatingOverlayProvider(_props: FloatingOverlayProviderProps): JSX.Element {
  return stub('FloatingOverlayProvider')
}

export function FloatingOverlayRoot(_props: FloatingOverlayRootProps): JSX.Element {
  return stub('FloatingOverlayRoot')
}

export function FloatingOverlayAnchor(_props: FloatingOverlayAnchorProps): JSX.Element {
  return stub('FloatingOverlayAnchor')
}

export function FloatingOverlayContent(_props: FloatingOverlayContentProps): JSX.Element {
  return stub('FloatingOverlayContent')
}

export function FloatingOverlayArrow(_props: FloatingOverlayArrowProps): JSX.Element {
  return stub('FloatingOverlayArrow')
}

export function useFloatingOverlayState(): FloatingOverlayState {
  return stub('useFloatingOverlayState')
}
