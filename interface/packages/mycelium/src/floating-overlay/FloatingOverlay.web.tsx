/**
 * Web stub for the native-first floating-overlay primitive (INFRA-2965).
 * Deliberately NOT implemented: web tooltips/popovers/menus ride the Base UI
 * floating-ui engine shipped by the INFRA-3021 menus family
 * (`popover-compat` / `shadcn` recipes in this package once that stack
 * lands). A second web positioning engine would duplicate it, so an
 * accidental web import fails loudly instead of forking behavior. The pure
 * `geometry` module stays importable everywhere (the workbench demo drives
 * it).
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

function webStub(name: string): never {
  throw new Error(
    `${name} is native-only (INFRA-2965). On web, use the Base UI floating overlays from the INFRA-3021 menus family instead of this primitive.`,
  )
}

export function FloatingOverlayProvider(_props: FloatingOverlayProviderProps): JSX.Element {
  return webStub('FloatingOverlayProvider')
}

export function FloatingOverlayRoot(_props: FloatingOverlayRootProps): JSX.Element {
  return webStub('FloatingOverlayRoot')
}

export function FloatingOverlayAnchor(_props: FloatingOverlayAnchorProps): JSX.Element {
  return webStub('FloatingOverlayAnchor')
}

export function FloatingOverlayContent(_props: FloatingOverlayContentProps): JSX.Element {
  return webStub('FloatingOverlayContent')
}

export function FloatingOverlayArrow(_props: FloatingOverlayArrowProps): JSX.Element {
  return webStub('FloatingOverlayArrow')
}

export function useFloatingOverlayState(): FloatingOverlayState {
  return webStub('useFloatingOverlayState')
}
