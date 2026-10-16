/**
 * The factory prop partition, shared by BOTH platform legs of `createIcon`
 * (INFRA-3508) so the supported/rejected boundary cannot drift between them.
 * Split out of `icon-props.ts` only for the max-lines cap — the partition is
 * part of the same compat surface.
 */
import { REJECTED_ICON_PROPS } from './icon-prop-coverage'
import { isIconCssLaneProp, reportRejectedIconProp, type IconCompatStyleProps } from './icon-props'

export interface IconPropsPartition {
  /** CSS-lane props (base lane) — each leg resolves them into its own style dialect. */
  cssLane: IconCompatStyleProps
  /** `$`-pool props (media/group), when any — the pool walk owns the key vocabulary. */
  pools: Record<string, IconCompatStyleProps> | undefined
  /** Everything else: SVG passthrough props. */
  passthrough: Record<string, unknown>
}

/**
 * Partition the factory's non-channel props: CSS lane, `$` pools,
 * ledger-rejected (dev throw / prod drop — `reportRejectedIconProp`), SVG
 * passthrough.
 */
export function partitionIconProps(rest: Record<string, unknown>): IconPropsPartition {
  const cssLane: IconCompatStyleProps = {}
  let pools: Record<string, IconCompatStyleProps> | undefined
  const passthrough: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined) {
      continue
    }
    if (isIconCssLaneProp(key)) {
      cssLane[key] = value as never
    } else if (key.startsWith('$')) {
      // Typed pools plus any untyped media/group sibling — the per-leg pool
      // walk owns the key vocabulary (unknown shapes throw there).
      ;(pools ??= {})[key] = value as IconCompatStyleProps
    } else if (Object.hasOwn(REJECTED_ICON_PROPS, key)) {
      reportRejectedIconProp(key)
    } else {
      passthrough[key] = value
    }
  }
  return { cssLane, pools, passthrough }
}
