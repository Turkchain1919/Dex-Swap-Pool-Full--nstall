/**
 * The legacy `@tamagui/accordion` `unstyled: false` frame defaults, translated
 * token-for-token through the repo's Tamagui theme: `$background` → surface1,
 * `$backgroundHover/Press/Focus` → surface2, `$borderColor` → transparent,
 * `padding: '$true'` → spacing8. Callers' props sit after these, so overrides
 * resolve as under Tamagui; the accordion parity suite diffs the translation
 * against the real legacy emission.
 */
import type { FlexCompatProps } from '../flex-compat/props'

export const TRIGGER_FRAME_DEFAULTS: FlexCompatProps = {
  cursor: 'pointer',
  backgroundColor: '$surface1',
  borderColor: '$transparent',
  borderWidth: 1,
  p: '$spacing8',
  hoverStyle: { backgroundColor: '$surface2' },
  pressStyle: { backgroundColor: '$surface2' },
  focusStyle: { backgroundColor: '$surface2' },
}

/**
 * The native at-rest slice: `cursor` and the pseudo scopes are web mechanisms;
 * the native leg swaps the pressed background in state instead.
 */
export const NATIVE_TRIGGER_FRAME_DEFAULTS: FlexCompatProps = {
  backgroundColor: '$surface1',
  borderColor: '$transparent',
  borderWidth: 1,
  p: '$spacing8',
}

export const NATIVE_TRIGGER_PRESSED_BACKGROUND = '$surface2'

export const CONTENT_FRAME_DEFAULTS: FlexCompatProps = {
  p: '$spacing8',
  backgroundColor: '$surface1',
}
