// Type-only import of the compat token maps' key unions — the same const maps
// the compat compilers read, so the `$`-token halves cannot drift from them.
import type { SporeRadiusToken, SporeSpaceToken } from './tokens'

/**
 * Drop-ins for the `ComponentProps<typeof View>` prop lookups the held modal
 * conversions annotate with (INFRA-3557): `position`, `maxWidth`, `maxHeight`,
 * `gap`, `flex`, `borderRadius`. Each converts by swapping the lookup for the
 * matching named type here.
 *
 * `ViewPositionProp` and `ViewFlexProp` mirror closed legacy unions exactly.
 * The size-valued lookups are OPEN on the legacy side: beyond the halves
 * mirrored here they accept Tamagui `Variable` objects and RN `AnimatedNode`s,
 * and mirroring those would couple mycelium to Tamagui/RN internals (the
 * documented `SpaceTokens` deviation shape, INFRA-3495). The pinned contract
 * is the strongest available: every string / number / null member of the
 * legacy lookup is a member here (residue `never`), and every member here is
 * assignable to the legacy lookup — pinned both directions by
 * `packages/tailwind/src/parity/sheet-view-props`, the drift guard. A file
 * whose annotated values need the object families keeps its legacy annotation.
 *
 * Interop/annotation types only — parameters, returns, locals. Distinct from
 * the compat component prop surfaces (`./props.ts`), which stay curated.
 */

/** The closed CSS size keywords Tamagui's size-valued props accept on web. */
type SizeKeyword = 'auto' | 'inherit' | 'max-content' | 'min-content' | 'unset'

/** Viewport-relative lengths (Tamagui's `WebOnlySizeValue` half). */
type ViewportLengthString =
  | `${number}dvh`
  | `${number}dvw`
  | `${number}lvh`
  | `${number}lvw`
  | `${number}svh`
  | `${number}svw`
  | `${number}vh`
  | `${number}vw`

/** CSS function values (Tamagui's `WebStyleValueUniversal` half plus size math). */
type CssFunctionString = `calc(${string})` | `max(${string})` | `min(${string})` | `var(${string})`

/**
 * The full string surface of a legacy size-valued prop. `` `${string}%` `` is
 * mutually assignable with Tamagui's branded `PercentString`
 * (`` `${string}%` & {} ``) — the brand adds nothing a string doesn't satisfy.
 */
type SizeString = SizeKeyword | ViewportLengthString | CssFunctionString | `${string}%`

/** `ComponentProps<typeof View>['position']` — closed, exactly mirrored. */
export type ViewPositionProp = 'absolute' | 'relative' | 'static' | 'unset'

/** `ComponentProps<typeof View>['flex']` — closed, exactly mirrored. */
export type ViewFlexProp = number | 'unset'

/**
 * `ComponentProps<typeof View>['maxWidth']`. `null` is a legacy member (RN
 * style semantics: unset the value), kept for exact caller compatibility.
 */
export type ViewMaxWidthProp = SporeSpaceToken | number | SizeString | null

/** `ComponentProps<typeof View>['maxHeight']` — same legacy surface as maxWidth. */
export type ViewMaxHeightProp = SporeSpaceToken | number | SizeString | null

/** `ComponentProps<typeof View>['gap']` — like maxWidth but no `null` on the legacy side. */
export type ViewGapProp = SporeSpaceToken | number | SizeString

/** `ComponentProps<typeof View>['borderRadius']` — radius tokens; no percent/viewport families. */
export type ViewBorderRadiusProp = SporeRadiusToken | number | 'inherit' | 'unset' | `var(${string})`
