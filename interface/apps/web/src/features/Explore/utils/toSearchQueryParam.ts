/**
 * Normalizes a table search box value into the data.v2 ListTokens/ListPools `filter.searchQuery`.
 * Blank input becomes `undefined` so an empty or whitespace-only box shares the unsearched query
 * key (no refetch, no separate cache entry); the backend does its own trim/lowercase/length cap.
 */
export function toSearchQueryParam(filterString: string): string | undefined {
  const trimmed = filterString.trim()
  return trimmed.length > 0 ? trimmed : undefined
}
