import type { TextCompatProps } from '../text-compat/props'
/**
 * Platform-neutral pieces shared by both `TouchableTextLinkCompat` legs: the
 * hover-color token swap and the disabled color fold — the `ModalCloseIcon`
 * compat's shared-resolve mechanism, which is what keeps the two legs
 * rendering the same colors.
 */
import { THEME_COLOR_TOKENS } from '../text-compat/theme-tokens.generated'
import { DISABLED_LINK_COLOR, type TouchableTextLinkColor } from './props'

const TOKEN_SET: ReadonlySet<string> = new Set(THEME_COLOR_TOKENS)

/**
 * The legacy `getMaybeHoverColor` (`ui/src/theme/tokens.ts`): a valid spore
 * token whose `<token>Hovered` counterpart exists maps to it; everything else
 * passes through. Same mirror as `TouchableAreaCompat.web.tsx`.
 */
export function maybeHoverColor(color: string): string {
  if (!color.startsWith('$')) {
    return color
  }
  const name = color.slice(1)
  return TOKEN_SET.has(name) && TOKEN_SET.has(`${name}Hovered`) ? `${color}Hovered` : color
}

/** The color the link text renders: the disabled palette folds over the caller's color. */
export function linkTextColor(color: TouchableTextLinkColor, disabled: boolean | undefined): string {
  return disabled === true ? DISABLED_LINK_COLOR : color
}

type TextStylePool = NonNullable<TextCompatProps['hoverStyle']>

/** The legacy hover pool: the hovered-token color swap, dropped while disabled. */
export function linkHoverPool({
  color,
  disabled,
}: {
  color: TouchableTextLinkColor
  disabled: boolean | undefined
}): TextStylePool {
  return { color: disabled === true ? undefined : maybeHoverColor(color) }
}

/**
 * The legacy focus pool: hovered color + underline, skipped by `noUnderline`.
 *
 * Two legacy members are deliberately absent because they are no-ops in the
 * legacy render: `textDecorationDistance: 1` maps to no CSS on web (it is a
 * Tamagui native-side prop, and the underline it would offset only exists on
 * web), and `textDecorationStyle: 'unset'` resolves to the initial `solid` the
 * underline already has. `textDecorationColor` is kept: its `focus:`-pool twin
 * exists, and it mirrors the legacy declaration exactly.
 *
 * Disabled folds to the disabled color exactly like `linkHoverPool` — a
 * focused disabled link must not pick up the hovered-token swap.
 */
export function linkFocusPool({
  color,
  disabled,
  noUnderline,
}: {
  color: TouchableTextLinkColor
  disabled: boolean | undefined
  noUnderline: boolean
}): TextStylePool {
  if (noUnderline) {
    return {}
  }
  const focusColor = disabled === true ? DISABLED_LINK_COLOR : maybeHoverColor(color)
  return {
    color: focusColor,
    textDecorationColor: focusColor,
    textDecorationLine: 'underline',
  }
}
