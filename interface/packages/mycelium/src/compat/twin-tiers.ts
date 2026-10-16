/**
 * The curated twin-tier data of the var-indirection lane (`inline-style.ts`,
 * which re-exports this module): which arbitrary-property / utility twins
 * each variant tier carries. Pure data — the conversion and matrix logic
 * stays in `inline-style.ts`.
 */

/**
 * The arbitrary-property twin surface of the VARIANT tiers — the curated,
 * practically-reachable property set: every layout/typography/color/
 * interaction/effect/outline surface the compat components style under
 * pseudo/media/theme/group pools (superset of every unstyled-fallback case
 * measured in the round-1/round-2 reviews: cursor, filter, box-shadow,
 * borderWidth, transforms, the focus-ring quartet, …). The rest of the
 * long tail (grid/mask/border-image/inline-axis niches) keeps variant-tier
 * dev-throw semantics: crossing THE FULL long tail with all 102 variant
 * prefixes measures ~323 KB gzip — 2.5x the ruling's 126.5 KB target — so
 * coverage there is a table entry + regeneration away instead (see the
 * closed-set module docs).
 */
export const VARIANT_TWIN_PROPS: readonly string[] = [
  // Layout enums.
  'flex-direction',
  'align-items',
  'align-self',
  'justify-content',
  'flex-wrap',
  'display',
  'position',
  'overflow',
  'overflow-x',
  'overflow-y',
  // Typography.
  'line-height',
  'font-weight',
  'font-family',
  'font-style',
  'letter-spacing',
  // Text surfaces.
  'text-align',
  'text-transform',
  'text-decoration-line',
  'text-decoration-color',
  'white-space',
  'text-overflow',
  'word-wrap',
  'word-break',
  'color',
  'background-color',
  // The `background` SHORTHAND rides the pseudo pools too: live call sites
  // pass it inside hoverStyle/focusStyle (the swap gas row's trigger), so the
  // longhand twin alone leaves those renders throwing at the variant tier.
  'background',
  'border-color',
  // Side-color longhands pair with the shorthand above: the underline-tab
  // shape (borderBottomColor under hover/press) rode a dead class without
  // its twin, and the full quartet keeps the side surfaces symmetric.
  'border-bottom-color',
  'border-top-color',
  'border-left-color',
  'border-right-color',
  // Interaction.
  'cursor',
  'pointer-events',
  'user-select',
  // Effects (transform for the press/focus scale pools, box-shadow and
  // filter for the review's measured unstyled-fallback call sites; transition
  // for the instant-pseudo/eased-base hover trick — INFRA-3825, `DataRow`'s
  // hoverStyle — supported at the base tier since INFRA-3330 but not here).
  'transition',
  'transform',
  'box-shadow',
  'filter',
  // Focus-ring outline surfaces.
  'outline-color',
  'outline-width',
  'outline-offset',
  'outline-style',
  // Truncation.
  '-webkit-line-clamp',
  '-webkit-box-orient',
  // border-style pairs with the border-width utilities under focus resets.
  // (opacity/spacing/sizing/radius/border widths are bracketed-value
  // UTILITIES and covered by the utility twins.)
  'border-style',
  // Grid + scrollbar surfaces: the live variant-pool call sites on main
  // (responsive gridTemplateColumns grids under $sm/$md/$lg/$xl and
  // scrollbarWidth under $sm) each rode a dead class without these twins —
  // measured in review round 3.
  'grid-template-columns',
  'scrollbar-width',
]

/**
 * The NAMED-GROUP tier (INFRA-3481): registered `group-<state>/<name>`
 * prefixes carry a twin row curated one step further than the variant tier —
 * the reveal/interaction surfaces the repo's named-group pools actually
 * style (census over every `$group-<name>-*` call site: display flips,
 * color/background/border swaps, opacity dims, transform nudges, filter,
 * cursor affordance on hover reveals).
 * The FULL variant row × the 10 named-group prefixes measures +13.0 KB gzip
 * on the synthetic mycelium compile — enough to blow apps/web's CSS budget —
 * while this row measures ~1 KB. Anything outside it keeps the named-group
 * dev-throw semantics: one entry here + regeneration away.
 */
export const NAMED_GROUP_TWIN_PROPS: readonly string[] = ['display', 'color', 'transform', 'filter', 'cursor']

/**
 * The bracketed-value utility twins the named-group tier carries: the dim
 * (`opacity`) and the color pair (`bg`/`border` — semantic, themed, and raw
 * color values all convert through these two, plus the color-form border
 * twin). Listing `border` also carries the border-WIDTH twin
 * (`border-⟦length¦var(--c*-border)⟧`) through the same bracketed-utility
 * path — the utility is width-or-color by value shape in every tier, so a
 * generated width entry per named-group prefix is expected, not tier bloat.
 * Spacing/sizing/radius/etc. keep dev-throw semantics under named
 * group prefixes.
 */
export const NAMED_GROUP_TWIN_UTILITIES: readonly string[] = ['opacity', 'bg', 'border']
