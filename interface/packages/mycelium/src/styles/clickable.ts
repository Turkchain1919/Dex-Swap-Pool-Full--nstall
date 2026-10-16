import type { FlexCompatProps } from '../flex-compat/props'

/**
 * Shared clickable affordance for compat primitives — the mycelium equivalent
 * of the legacy web `ClickableTamaguiStyle`: pointer cursor, hover/press
 * opacity feedback, an opacity-scoped transition, and the text-decoration
 * reset for link-tagged sites (`no-underline` — a web CSS rule, so it
 * degrades to a no-op wherever no stylesheet rule resolves).
 *
 * Spread it onto a compat primitive at the position the style props belong,
 * so explicit props at the call site can still override it:
 * `<Flex {...clickableStyle} onPress={…}>`.
 *
 * `className`, `style`, `hoverStyle`, and `pressStyle` are all object/single-
 * valued keys, so spreading this after your own values *replaces* them
 * rather than merging — you'll silently lose `no-underline`, the opacity
 * transition, or the hover/press opacity feedback. Merge explicitly instead:
 * `cn(clickableStyle.className, 'my-class')` for `className`, and
 * `{ ...clickableStyle.style, ...myStyle }` (same pattern for `hoverStyle`/
 * `pressStyle`) for the rest. Only `cursor` is a scalar, so it merges fine
 * as-is.
 */
export const clickableStyle = {
  cursor: 'pointer',
  hoverStyle: { opacity: 0.8 },
  pressStyle: { opacity: 0.6 },
  className: 'no-underline',
  // Scoped to opacity — a bare-duration transition means `all`, which
  // animates theme-token color changes on light/dark toggle.
  style: { transition: 'opacity 100ms' },
} as const satisfies FlexCompatProps
