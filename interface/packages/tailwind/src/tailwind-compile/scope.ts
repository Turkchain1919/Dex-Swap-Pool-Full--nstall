/**
 * Canonical rule scopes for compiled Tailwind CSS.
 *
 * A compiled utility class can emit declarations under several conditions —
 * pseudo classes, media queries, group states, enter/exit animation states,
 * and the dark-theme class. This module reduces a rule's nested selector
 * parts down to one canonical scope key, so a class's declarations can be
 * bucketed and merged per scope (see `scopeKey` / `foldThemeScopeKey`).
 */

export interface RuleScope {
  media: string[]
  pseudo?: 'hover' | 'active' | 'focus' | 'focus-visible' | 'focus-within' | 'disabled'
  /** `group-hover`, `group-active/item`, … (Tailwind variant spelling). */
  group?: string
  /** A direct-children rule (the `[&>*]:` arbitrary variant). */
  child?: boolean
  enter?: boolean
  exit?: boolean
  dark?: boolean
}

export const BASE_SCOPE = ''

/**
 * Theme folding: a scope key's `dark`/`light` part expresses "only under
 * that theme", so when resolving for a specific theme the matching theme
 * part folds away (the declarations apply, merging into the remaining scope
 * and overriding its earlier declarations, exactly like the higher-specificity
 * theme rules do in the cascade) and the opposite theme's scopes drop
 * entirely. Returns the folded key, or undefined when the scope does not
 * apply under `theme`.
 */
export function foldThemeScopeKey(key: string, theme: 'light' | 'dark'): string | undefined {
  const parts = key === BASE_SCOPE ? [] : key.split('+')
  const themePart = parts.find((part) => part === 'dark' || part === 'light')
  if (themePart === undefined) {
    return key
  }
  if (themePart !== theme) {
    return undefined
  }
  return parts.filter((part) => part !== themePart).join('+')
}

/** Normalize a media query's text: lowercase, no spaces. */
function canonicalMedia(query: string): string {
  return query
    .replace(/^@media\s*/, '')
    .replace(/\s+/g, '')
    .toLowerCase()
}

/** The hover-capability guard, canonicalized to one conjunct. */
const HOVER_GUARD_MEDIA = new Set(['(hover)', '(hover:hover)'])
const CANONICAL_HOVER_GUARD = '(hover:hover)'

/** A media list's individual conjuncts (`(hover) and (max-width: 450px)` → both parts). */
function mediaConjuncts(media: string[]): string[] {
  return media
    .flatMap((query) => canonicalMedia(query).split('and').filter(Boolean))
    .map((conjunct) => (HOVER_GUARD_MEDIA.has(conjunct) ? CANONICAL_HOVER_GUARD : conjunct))
}

/** Build the canonical scope key from parsed parts. */
export function scopeKey(scope: RuleScope): string {
  // group-hover's hover-media-guard folds away: the unnamed-group marker has
  // no media query of its own but only ever fires on hover-capable devices,
  // so keeping the guard in the key would just duplicate the `group-hover`
  // part. Every other `:hover` scope keeps its guard in the key so a rule
  // guarded by `(hover: hover)` doesn't collide with an unguarded one.
  const foldHoverGuard = scope.group?.startsWith('group-hover') === true
  const conjuncts = [...new Set(mediaConjuncts(scope.media))].filter(
    (query) => !(foldHoverGuard && query === CANONICAL_HOVER_GUARD),
  )
  const parts = [
    ...conjuncts.sort().map((query) => `media${query}`),
    scope.pseudo,
    scope.group,
    scope.child === true ? 'child' : undefined,
    scope.enter === true ? 'enter' : undefined,
    scope.exit === true ? 'exit' : undefined,
    scope.dark === true ? 'dark' : scope.dark === false ? 'light' : undefined,
  ].filter((part): part is string => part !== undefined)
  return parts.join('+')
}

const PSEUDO_CLASS_SCOPE: Record<string, RuleScope['pseudo']> = {
  ':hover': 'hover',
  ':active': 'active',
  ':focus': 'focus',
  ':focus-visible': 'focus-visible',
  ':focus-within': 'focus-within',
}

/** Parse a `&:is(:where(.group…):<state> *)` variant part to its canonical group scope. */
function parseTailwindGroupPart(part: string): string | undefined {
  const prefix = '&:is(:where(.group'
  const suffix = ' *)'
  if (!part.startsWith(prefix) || !part.endsWith(suffix)) {
    return undefined
  }
  const inner = part.slice(prefix.length, -suffix.length)
  const closeIdx = inner.indexOf(')')
  if (closeIdx === -1) {
    return undefined
  }
  const namePart = inner.slice(0, closeIdx)
  const statePart = inner.slice(closeIdx + 1)
  if (!statePart.startsWith(':')) {
    return undefined
  }
  const state = statePart.slice(1)
  if (!['hover', 'active', 'focus', 'focus-visible', 'focus-within'].includes(state)) {
    return undefined
  }
  if (namePart === '') {
    return `group-${state}`
  }
  if (!namePart.startsWith('\\/')) {
    return undefined
  }
  return `group-${state}/${namePart.slice(2)}`
}

/**
 * Parse a flattened Tailwind rule's nested-selector parts (everything after
 * the utility class itself, each part beginning with `&`).
 */
export function parseTailwindNestedParts(parts: string[]): Omit<RuleScope, 'media' | 'enter'> | undefined {
  const scope: Omit<RuleScope, 'media' | 'enter'> = {}
  for (const part of parts) {
    const trimmed = part.trim()
    const pseudo = PSEUDO_CLASS_SCOPE[trimmed.replace('&', '')]
    if (pseudo !== undefined) {
      scope.pseudo = pseudo
      continue
    }
    const group = parseTailwindGroupPart(trimmed)
    if (group !== undefined) {
      scope.group = group
      continue
    }
    if (trimmed === '&:is(.dark *)') {
      scope.dark = true
      continue
    }
    if (
      trimmed === '&:not(:is(.dark *))' ||
      trimmed === '&:not(*:is(.dark *))' ||
      trimmed === '&:where(:not(:is(.dark *)))'
    ) {
      // $theme-light — the complement scope; canonicalized as its own key.
      // The `:where()` form is the `light` variant's spelling (same match
      // set, specificity dropped to restore the legacy cascade slot — see
      // packages/tailwind/css/compat.css).
      scope.dark = false
      continue
    }
    if (/^&\s*>\s*\*$/.test(trimmed)) {
      // The `[&>*]:` arbitrary variant — the direct-children half of the
      // pointerEvents box-value polyfill (INFRA-3490).
      scope.child = true
      continue
    }
    if (trimmed === '&[aria-disabled="true"]') {
      scope.pseudo = 'disabled'
      continue
    }
    if (trimmed === '&[data-exiting]') {
      scope.exit = true
      continue
    }
    return undefined
  }
  return scope
}
