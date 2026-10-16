/**
 * Adapters between `UniversalList`'s prop shapes and Legend List's, shared by both engine legs so a
 * change to either mapping can't land on one platform and miss the other.
 *
 * Plain factories rather than hooks on purpose: the `useMemo` stays at each call site, where its
 * dependency is visible, and these stay directly unit-testable without a renderer. Nothing here may
 * import `react-native` — the web leg resolves this module too.
 */

/** Legend List's span hook: a mutator over the layout object rather than a return-based callback. */
// oxlint-disable-next-line eslint/max-params -- arity is fixed by Legend List's overrideItemLayout callback
type OverrideItemLayout<T> = (layout: { span?: number }, item: T, index: number) => void

/**
 * Adapts our narrower, return-based `getItemSpan` onto {@link OverrideItemLayout}, leaving the
 * layout untouched when the consumer has no opinion so an engine-set span survives.
 */
export function createOverrideItemLayout<T>(
  getItemSpan: ((item: T, index: number) => number | undefined) | undefined,
): OverrideItemLayout<T> | undefined {
  if (!getItemSpan) {
    return undefined
  }

  // oxlint-disable-next-line eslint/max-params -- arity is fixed by Legend List's overrideItemLayout callback
  return (layout, item, index) => {
    const span = getItemSpan(item, index)
    if (span !== undefined) {
      layout.span = span
    }
  }
}

/** Legend List keys its recycling pool by string, so coerce whatever `getItemType` returns. */
export function createItemTypeResolver<T>(
  getItemType: ((item: T, index: number) => string | number) | undefined,
): ((item: T, index: number) => string) | undefined {
  if (!getItemType) {
    return undefined
  }

  return (item: T, index: number): string => String(getItemType(item, index))
}
