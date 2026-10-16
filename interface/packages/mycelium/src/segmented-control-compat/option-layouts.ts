/**
 * Drops stored option layouts whose option value is no longer rendered, so the
 * layout map can't grow without bound — or hold a stale rect for a removed
 * option — as `options` changes over time (INFRA-2966 review follow-up).
 *
 * Returns `layouts` unchanged (same reference) when every stored key is still
 * a rendered option, so `setState` callers bail out without a re-render; only
 * allocates a new map when there is actually something to prune.
 */
export function pruneOptionLayouts<T extends string, TLayout>({
  layouts,
  options,
}: {
  layouts: Partial<Record<T, TLayout>>
  options: ReadonlyArray<{ value: T }>
}): Partial<Record<T, TLayout>> {
  let hasStaleKey = false
  for (const key in layouts) {
    if (!options.some((option) => option.value === key)) {
      hasStaleKey = true
      break
    }
  }
  if (!hasStaleKey) {
    return layouts
  }
  const pruned: Partial<Record<T, TLayout>> = {}
  for (const option of options) {
    const layout = layouts[option.value]
    if (layout !== undefined) {
      pruned[option.value] = layout
    }
  }
  return pruned
}
