/**
 * One-time pseudo-element rule injection for the Input compat (ported from the
 * ui/src INFRA-3318 rebuild). ::placeholder / ::selection can't be inline
 * styles, so the hook injects two static attribute-keyed rules once and the
 * per-instance colors are delivered through CSS custom properties set inline.
 * This is runtime style delivery for pseudo-elements, not statically-scanned
 * class emission. DOM code — imported only from InputCompat.web.tsx.
 */
import { useEffect } from 'react'

function ensurePseudoRules(): void {
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
 * Ensures the shared `[data-uds-placeholder]`/`[data-uds-selection]` pseudo-element
 * rules exist in the document, injecting them on mount when absent. Idempotent
 * across instances (the DOM marker is the dedupe) and a no-op outside the DOM.
 */
export function useEnsurePseudoRules(): void {
  useEffect(ensurePseudoRules, [])
}
