/**
 * The `Anchor` compat prop contract (INFRA-3549). The legacy component
 * (tamagui's `Anchor`, re-exported raw from the `ui/src` barrel) is
 * `styled(SizableText, { tag: 'a', accessibilityRole: 'link' })` plus
 * `href`/`target`/`rel` — a Text with the anchor link surface, which
 * TextCompat already carries publicly (`compat/props.ts` `tag`/`href`/
 * `target`/`rel`). The compat surface is therefore the TextCompat surface
 * itself, and the legacy typography defaults need no overrides: `$body`/
 * `$true`/`$color` resolve to the same body2 metrics and `$neutral1` color
 * TextCompat already defaults to (`ui/src/theme/tamaguiFonts.ts` maps
 * `$body`'s `true` size to body2; `text-compat/defaults.ts`).
 */
import type { TextCompatProps } from '../text-compat/props'

export type AnchorCompatProps = TextCompatProps

/** The rendered element when the caller does not override `tag` (the legacy styled default). */
export const DEFAULT_ANCHOR_TAG = 'a'
