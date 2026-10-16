/**
 * Shared one-time dev-diagnostic plumbing for the compat families.
 *
 * The gate composes the environment package's canonical checks instead of a
 * per-file `__DEV__` probe: `isRNDev` (Metro dev bundles), `isDevEnv` (dev
 * build flavors and the local web server), and `isTestEnv` (the suites assert
 * these warnings fire). Release builds stay silent.
 */
import { isDevEnv, isRNDev, isTestEnv } from '@universe/environment'

/** Whether developer-facing compat diagnostics should emit at all. */
export function isDevDiagnosticsEnv(): boolean {
  return isRNDev() || isDevEnv() || isTestEnv()
}

export interface OneTimeWarner {
  /** Emit `message` once per `key` (per JS runtime), dev/test environments only. */
  warnOnce(key: string, message: string): void
  /** Test-only: clears the guard so suites can assert the warning per case. */
  reset(): void
}

/** One warner per diagnostic family — each family owns its keyspace and reset. */
export function createOneTimeWarner(): OneTimeWarner {
  const warned = new Set<string>()
  return {
    warnOnce(key: string, message: string): void {
      if (!isDevDiagnosticsEnv() || warned.has(key)) {
        return
      }
      warned.add(key)
      // oxlint-disable-next-line no-console -- dev/test-only diagnostic; the compat drop paths are otherwise silent (uniwind and the DOM both ignore what they don't understand)
      console.warn(message)
    },
    reset(): void {
      warned.clear()
    },
  }
}
