import type { PerformanceTracker } from '@universe/sessions/src/performance/types'

/** Sentinel value indicating performance tracking is disabled */
export const PERFORMANCE_TRACKING_DISABLED = -1

interface CreatePerformanceTrackerContext {
  /**
   * Injected timing function. This is the actual performance API.
   * Allows the caller to pass performance.now, Date.now, or a mock.
   * Required - no implicit dependency on globalThis.performance.
   */
  getNow: () => number
}

/**
 * Creates a performance tracker backed by the injected getNow() function.
 *
 * Kept as a factory so all five call sites (web, mobile, extension, dev-portal, rh-cca) construct the tracker identically.
 */
function createPerformanceTracker(ctx: CreatePerformanceTrackerContext): PerformanceTracker {
  return { now: () => ctx.getNow() }
}

export { createPerformanceTracker }
export type { CreatePerformanceTrackerContext }
