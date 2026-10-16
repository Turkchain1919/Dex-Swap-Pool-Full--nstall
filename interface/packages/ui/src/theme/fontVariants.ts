/**
 * Theme typography as `<Text variant />` tokens: $body2 → variant="body2". Resolved via getFontStylesForVariant.
 *
 * Tamagui-free defining file (INFRA-3290): keep it free of `tamagui`/`@tamagui/*` imports — including
 * `./fonts` (Tamagui-free itself since INFRA-3317, but its graph stays heavier than this leaf).
 * Membership is pinned to `keyof typeof fonts` by the
 * compile-time check in ./fonts.ts, and the same union is published Tailwind-side as
 * `@universe/tailwind/types` `FontVariantToken` (re-exported by `@universe/mycelium`). The drift pin
 * below lives here, not in packages/tailwind: tailwind must not reference ui — mycelium re-exports
 * tailwind's types, so a tailwind → ui edge would make any ui → mycelium import circular (TS6202).
 */
import type { FontVariantToken as TailwindFontVariantToken } from '@universe/tailwind/types'

export type FontVariantToken =
  | '$heading1'
  | '$heading2'
  | '$heading3'
  | '$subheading1'
  | '$subheading2'
  | '$body1'
  | '$body2'
  | '$body3'
  | '$body4'
  | '$body5'
  | '$buttonLabel1'
  | '$buttonLabel2'
  | '$buttonLabel3'
  | '$buttonLabel4'
  | '$monospace'

type _Pin<T extends true> = T
/**
 * Compile-time pin (INFRA-3290): the two hand-written Tamagui-free copies of this union — here and
 * `@universe/tailwind/types` — must stay identical; either drift direction fails typecheck here.
 */
type _FontVariantTokenIsPinnedToTailwindCopy = _Pin<
  [FontVariantToken] extends [TailwindFontVariantToken]
    ? [TailwindFontVariantToken] extends [FontVariantToken]
      ? true
      : false
    : false
>
