/** One component of the dedupe key. Undefined or empty means it has not arrived yet. */
type KeyPart = string | number | undefined

export interface LogOnceArgs {
  /**
   * Identifies the thing being reported, joined into the dedupe key — usually
   * `[chainId, auctionAddress]`. Passed unjoined so the guard, not the caller, decides what an
   * incomplete identity means.
   */
  keyParts: KeyPart[]
  /**
   * Whether the failure is *terminal* — i.e. it will not resolve itself. Must be the complete
   * condition, fully evaluated: absence of data is not terminality, since a request that will be
   * retried is not terminal however empty the store looks.
   */
  isTerminal: boolean
  /** Runs at most once per key per session, and only when `isTerminal`. */
  log: () => void
}

export interface LogOnceGuard {
  logOnce: (args: LogOnceArgs) => void
  /** Test-only: clears the once-per-session state. */
  reset: () => void
}

/**
 * A once-per-session log guard: the key is claimed only after `isTerminal` passes, and never for a
 * subject whose key parts have not all arrived. A transient failure that spent the key would leave
 * the permanent failure the log exists to report silent.
 */
export function createLogOnceGuard(): LogOnceGuard {
  const claimedKeys = new Set<string>()

  return {
    logOnce: ({ keyParts, isTerminal, log }: LogOnceArgs): void => {
      if (!isTerminal) {
        return
      }

      // Falsy, not just undefined: an empty address identifies nothing either, and joining one in
      // would build a key shared by every unidentified subject in the session.
      if (keyParts.some((part) => !part)) {
        return
      }

      const key = keyParts.join(':')
      if (claimedKeys.has(key)) {
        return
      }
      claimedKeys.add(key)
      log()
    },
    reset: (): void => {
      claimedKeys.clear()
    },
  }
}
