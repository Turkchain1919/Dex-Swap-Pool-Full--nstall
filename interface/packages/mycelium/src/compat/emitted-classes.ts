/**
 * Shared helpers for the two compat emission gates — the mycelium-side
 * compile gate (`emission-gate.test.ts`) and the apps/web built-CSS gate
 * (`apps/web/scripts/check-client-build.ts`) — so the two can never diverge
 * on what counts as an emitted class or on the batch-one fixture.
 *
 * FIXTURE STRINGS ARE ENCODED, deliberately: Tailwind's oxide scanner
 * extracts candidate-shaped literals from every scanned source file, and
 * both consumers of this module live inside scanned trees (apps/web scans
 * `packages/mycelium/src` and its own `scripts/`). A literal fixture entry
 * would therefore emit ITSELF into the built CSS and turn the gate into a
 * tautology — the round-2 review's `@source` literal-scanning finding. The
 * encoding swaps `[`/`]`/`:` for non-candidate characters; `decodeFixture`
 * restores them at runtime, where the scanner cannot see.
 */

/** Unescape every class selector token in the stylesheet (`.gap-\[8px\]` → `gap-[8px]`). */
export function emittedClassNames(css: string): Set<string> {
  const classes = new Set<string>()
  for (const match of css.matchAll(/\.((?:\\.|[a-zA-Z0-9_-])+)/g)) {
    classes.add((match[1] as string).replace(/\\(.)/g, '$1'))
  }
  return classes
}

/** Decode a scanner-proof fixture entry (`gap-⟦28px⟧`, `media-md¦flex-col`) to the real class. */
export function decodeFixture(encoded: string): string {
  return encoded.replace(/⟦/g, '[').replace(/⟧/g, ']').replace(/¦/g, ':')
}

/**
 * The classes the first conversion batch's call sites compile to (#37844 /
 * INFRA-3175), asserted against the closed set AND against the built CSS.
 * BASE-tier entries are the batch's token-keyed classes (11 of the 14
 * previously-missing classes); the 3 media-tier previously-missing classes
 * (`media-md¦flex-col`, `media-md¦items-stretch`, `media-md¦gap-⟦16px⟧` —
 * encoded HERE TOO: oxide extracts candidate-shaped literals from COMMENTS,
 * and this file is not a test file, so a plainly-spelled class name in this
 * JSDoc emits itself into every consuming app's CSS — round-4 review)
 * now ride the variant var-indirection twins instead — see
 * `BATCH_ONE_VARIANT_TWINS` — per the INFRA-3217 round-2 CSS ruling.
 */
export const BATCH_ONE_BASE_FIXTURE: readonly string[] = [
  // The 11 base-tier previously-missing classes (INFRA-3217).
  'gap-⟦28px⟧',
  'mt-⟦12px⟧',
  'min-w-⟦24px⟧',
  'h-⟦36px⟧',
  'h-⟦1px⟧',
  'py-⟦40px⟧',
  'pt-⟦1px⟧',
  'pt-⟦2px⟧',
  '⟦line-height¦18px⟧',
  '⟦line-height¦16px⟧',
  '⟦color¦var(--stext-neutral3)⟧',
  // Control classes the batch verified as present (literals and token
  // classes that must keep emitting).
  'flex',
  'flex-row',
  'flex-col',
  'items-center',
  'items-stretch',
  'justify-between',
  'justify-center',
  'shrink-0',
  'grow',
  'shrink',
  'basis-auto',
  'box-border',
  'relative',
  'absolute',
  'overflow-hidden',
  'whitespace-nowrap',
  'text-ellipsis',
  'max-w-full',
  'min-h-⟦0px⟧',
  'min-w-⟦0px⟧',
  'gap-⟦4px⟧',
  'gap-⟦8px⟧',
  'gap-⟦12px⟧',
  'gap-⟦16px⟧',
  'px-⟦8px⟧',
  'py-⟦8px⟧',
  'pt-⟦8px⟧',
  'w-⟦16px⟧',
  'h-⟦16px⟧',
  'w-⟦20px⟧',
  'h-⟦20px⟧',
  'rounded-⟦12px⟧',
  'bg-surface2',
  'bg-surface3',
  'text-⟦14px⟧',
  '⟦font-weight¦485⟧',
  '⟦color¦var(--stext-neutral1)⟧',
  '⟦color¦var(--stext-neutral2)⟧',
].map(decodeFixture)

/**
 * The variant twins carrying the batch's 3 media-tier previously-missing
 * cases (`$md={{ flexDirection: 'column', alignItems: 'stretch', gap: 16 }}`)
 * under the var-indirection lane. Their presence in the built CSS — plus the
 * by-execution probes in compose-emission.test.ts — is what "the page styles
 * correctly under media-md" now means; the per-value `media-md:*` classes are
 * deliberately no longer emitted.
 */
export const BATCH_ONE_VARIANT_TWINS: readonly string[] = [
  'media-md¦⟦flex-direction¦var(--cE-fd)⟧',
  'media-md¦⟦align-items¦var(--cE-ai)⟧',
  'media-md¦gap-⟦var(--cE-gap)⟧',
].map(decodeFixture)

/**
 * The named-group reveal twins (INFRA-3481): the registered-name group pools'
 * var-indirection twins carrying the display-reveal pattern the INFRA-3143
 * batch measured as a silent no-op (`group="item"` anchor +
 * `$group-item-hover={{ display: 'flex' }}` consumer — HookCard /
 * HookSearchModal). Before INFRA-3481 the generated safelist had ZERO
 * name-parameterized group entries and no twin namespace for them, so the
 * class rendered in the DOM with no rule in any built stylesheet. Pinned as an
 * INDEPENDENT literal list (not derived from `REGISTERED_GROUP_NAMES`) so
 * gutting the registry reds the drift gate instead of shrinking the pin.
 */
export const NAMED_GROUP_REVEAL_TWINS: readonly string[] = [
  // The `item` pool (the INFRA-3143 repro shape).
  'group-hover/item¦⟦display¦var(--cghi-di)⟧',
  'group-hover/item¦⟦color¦var(--cghi-col)⟧',
  'group-hover/item¦opacity-⟦var(--cghi-opacity)⟧',
  'group-hover/item¦⟦transform¦var(--cghi-tr)⟧',
  'group-hover/item¦⟦cursor¦var(--cghi-c)⟧',
  'group-active/item¦⟦display¦var(--cgai-di)⟧',
  'group-focus/item¦⟦display¦var(--cgfi-di)⟧',
  'group-focus-visible/item¦⟦display¦var(--cgvi-di)⟧',
  'group-focus-within/item¦⟦display¦var(--cgwi-di)⟧',
  // The `card` pool (FeatureFlagModal / createIcon consumers).
  'group-hover/card¦⟦display¦var(--cghc-di)⟧',
  'group-hover/card¦⟦color¦var(--cghc-col)⟧',
  'group-active/card¦⟦display¦var(--cgac-di)⟧',
].map(decodeFixture)

/**
 * The `pointerEvents` box-value polyfill pair (INFRA-3490): the classes the
 * long-tail compiler emits for the React-Native-only values `box-none` /
 * `box-only`, matching legacy Tamagui web's polyfill (element rule + `>*`
 * children rule). Before INFRA-3490 the values passed through as CSS —
 * `pointer-events: box-none` is invalid, the browser dropped it, and a
 * converted overlay silently blocked every click underneath (the INFRA-3102
 * QuickSelectDefaultTokenOptions hold). Pinned as an INDEPENDENT literal list
 * so trimming the compiler table or the closed-set family reds the drift gate
 * instead of shrinking the pin.
 */
export const POINTER_EVENTS_BOX_POLYFILL: readonly string[] = [
  '⟦pointer-events¦none⟧',
  '⟦pointer-events¦auto⟧',
  '⟦&>*⟧¦⟦pointer-events¦auto⟧',
  '⟦&>*⟧¦⟦pointer-events¦none⟧',
].map(decodeFixture)

/**
 * The curated-surface classes INFRA-3496 added (the INFRA-2962 P6-P8
 * escalations): TextCompat `whiteSpace` wrap/initial (holds
 * DisplayNameText.tsx and the BridgedAsset batch), `display` grid /
 * inline-grid on both compat display maps, and the `overflow-wrap` /
 * `text-decoration` long-tail singles the `$platform-web` call sites pass.
 * Pinned as an independent literal list so trimming the enum maps or the
 * ENUMERABLE_LONG_TAIL entries reds the drift gate instead of shrinking it.
 */
export const CURATED_SURFACE_3496_FIXTURE: readonly string[] = [
  '⟦white-space¦wrap⟧',
  '⟦white-space¦initial⟧',
  'grid',
  'inline-grid',
  '⟦display¦grid⟧',
  '⟦display¦inline-grid⟧',
  '⟦overflow-wrap¦anywhere⟧',
  '⟦overflow-wrap¦break-word⟧',
  '⟦overflow-wrap¦normal⟧',
  '⟦text-decoration¦underline⟧',
  '⟦text-decoration¦line-through⟧',
  '⟦text-decoration¦none⟧',
].map(decodeFixture)

/**
 * Probe strings that exist ONLY inside test files: they must be ABSENT from
 * any built CSS. Their presence means either the per-value variant
 * enumeration crept back (the ruling's budget exists to prevent that) or
 * test files leaked back into an app's `@source` scan (the `@source not`
 * exclusion in apps/web/src/tailwind.css regressed).
 */
export const PROBE_LEAK_CANARIES: readonly string[] = [
  'media-md¦hover¦gap-⟦8px⟧',
  '⟦container-name¦item⟧',
  // The batch's 3 media-tier per-value classes: they ride the variant twins
  // and must NEVER re-emit — not from the enumeration creeping back and not
  // from a candidate-shaped literal in ANY scanned source, comments included
  // (the round-4 doc-comment leak in this very file).
  'media-md¦flex-col',
  'media-md¦items-stretch',
  'media-md¦gap-⟦16px⟧',
].map(decodeFixture)
