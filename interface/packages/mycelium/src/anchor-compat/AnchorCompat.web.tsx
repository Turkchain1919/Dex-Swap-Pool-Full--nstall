/**
 * Web leg of the `Anchor` compat (INFRA-3549) — the drop-in twin of the legacy
 * Tamagui `Anchor` (`styled(SizableText, { tag: 'a', accessibilityRole:
 * 'link' })` plus `href`/`target`/`rel`, re-exported raw from the `ui/src`
 * barrel): a TextCompat rendered as an anchor.
 *
 * Everything the legacy component adds over Text is here, and nothing else:
 * - `tag` defaults to `a` (a caller-supplied `tag` still wins, exactly like
 *   the legacy styled default), which routes the already-public
 *   `href`/`target`/`rel` TextCompat props onto the DOM anchor and engages
 *   TextCompat's anchor-only inline base color (the unlayered global
 *   `a { color }` fight — see `TextCompat.web.tsx`).
 * - `role` defaults to `link` (the legacy `accessibilityRole: 'link'` through
 *   the react-native-web ARIA mapping).
 *
 * Typography defaults ride TextCompat untouched: the legacy `$body`/`$true`/
 * `$color` defaults are the body2/`$neutral1` defaults TextCompat resolves.
 */
import * as React from 'react'
import { markMyceliumPrimitive } from '../compat/primitive-marker'
import { TextCompat } from '../text-compat/TextCompat'
import { type AnchorCompatProps, DEFAULT_ANCHOR_TAG } from './props'

export const AnchorCompat = React.forwardRef<HTMLElement, AnchorCompatProps>(function AnchorCompat(props, ref) {
  return <TextCompat role="link" {...props} tag={props.tag ?? DEFAULT_ANCHOR_TAG} ref={ref} />
})
// Marks the outermost forwardRef object so legacy TouchableArea's WithInjectedColors
// skips it instead of injecting color/backgroundColor (INFRA-3823).
markMyceliumPrimitive(AnchorCompat)
