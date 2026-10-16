/** How often to poll REST as a fallback for fresh prices */
export const REST_POLL_INTERVAL_MS = 30_000

/** A cached price younger than this lets a poll tick skip the wire.
 *  Deliberately separate from the poll cadence: widening this window to shed
 *  REST load must not slow how often staleness is checked. */
export const REST_FRESHNESS_WINDOW_MS = 30_000

/** If a cached price is older than this while WS reports connected,
 *  trigger REST polling as a safety net against silent WS failures. */
export const STALE_PRICE_THRESHOLD_MS = 60_000

/** Prices older than this are withheld from consumers (e.g. a rehydrated
 *  day-old value must not render as current) until a fresh update lands. */
export const MAX_DISPLAYABLE_PRICE_AGE_MS = 15 * 60 * 1000

/** Maximum tokens per REST request (backend limit) */
export const MAX_BATCH_SIZE = 100

/** Delay before flushing a batch (~one frame). Allows requests from separate
 *  macrotasks (e.g. React Query refetchInterval callbacks) to be grouped. */
export const BATCH_DELAY_MS = 16
