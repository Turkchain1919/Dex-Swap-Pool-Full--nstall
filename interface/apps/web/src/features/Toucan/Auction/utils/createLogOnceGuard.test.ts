import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createLogOnceGuard } from '~/features/Toucan/Auction/utils/createLogOnceGuard'

const KEY_PARTS = [1, '0xabc']

describe('createLogOnceGuard', () => {
  let log: () => void

  beforeEach(() => {
    log = vi.fn()
  })

  it('runs the log the first time a terminal failure is reported', () => {
    const guard = createLogOnceGuard()

    guard.logOnce({ keyParts: KEY_PARTS, isTerminal: true, log })

    expect(log).toHaveBeenCalledTimes(1)
  })

  it('suppresses repeats for the same key', () => {
    const guard = createLogOnceGuard()

    guard.logOnce({ keyParts: KEY_PARTS, isTerminal: true, log })
    guard.logOnce({ keyParts: KEY_PARTS, isTerminal: true, log })
    guard.logOnce({ keyParts: KEY_PARTS, isTerminal: true, log })

    expect(log).toHaveBeenCalledTimes(1)
  })

  it('keeps separate keys independent', () => {
    const guard = createLogOnceGuard()

    guard.logOnce({ keyParts: [1, '0xaaa'], isTerminal: true, log })
    guard.logOnce({ keyParts: [1, '0xbbb'], isTerminal: true, log })

    expect(log).toHaveBeenCalledTimes(2)
  })

  // THE property this factory exists for. All three hand-written guards it replaces claimed the key
  // as a side effect of asking "have I logged?", so a non-terminal call burned the key and the
  // permanent failure it existed to report was then silent. A non-terminal call must be a no-op.
  it('does not consume the key when the failure is not terminal', () => {
    const guard = createLogOnceGuard()

    guard.logOnce({ keyParts: KEY_PARTS, isTerminal: false, log })
    expect(log).not.toHaveBeenCalled()

    // The transient blip must not have spent the key: the real, terminal failure still reports.
    guard.logOnce({ keyParts: KEY_PARTS, isTerminal: true, log })
    expect(log).toHaveBeenCalledTimes(1)
  })

  it('survives many non-terminal calls before the terminal one', () => {
    const guard = createLogOnceGuard()

    for (let i = 0; i < 25; i++) {
      guard.logOnce({ keyParts: KEY_PARTS, isTerminal: false, log })
    }
    guard.logOnce({ keyParts: KEY_PARTS, isTerminal: true, log })

    expect(log).toHaveBeenCalledTimes(1)
  })

  // The precondition the call sites used to hand-write. Without it a missing part collapses into a
  // near-empty key like ":" or "1:", shared by every unidentified subject — so the first one to
  // report silences the rest. Held here so a fourth signal cannot forget it.
  it('does not log for a subject whose key parts have not all arrived', () => {
    const guard = createLogOnceGuard()

    guard.logOnce({ keyParts: [undefined, undefined], isTerminal: true, log })
    guard.logOnce({ keyParts: [1, undefined], isTerminal: true, log })
    guard.logOnce({ keyParts: [undefined, '0xabc'], isTerminal: true, log })
    // An empty address is as unidentified as a missing one, and collapses to the same "1:".
    guard.logOnce({ keyParts: [1, ''], isTerminal: true, log })

    expect(log).not.toHaveBeenCalled()
  })

  // The claim must be the *last* thing that happens, after both guards above it. Walks the sequence
  // a real render loop produces — the identity arrives before the failure settles — and no earlier
  // state may spend the key. Fails if the claim is hoisted ahead of the `isTerminal` check.
  it('claims the key only after isTerminal passes, not while identifying the subject', () => {
    const guard = createLogOnceGuard()

    guard.logOnce({ keyParts: [undefined, undefined], isTerminal: false, log })
    guard.logOnce({ keyParts: [undefined, undefined], isTerminal: true, log })
    guard.logOnce({ keyParts: KEY_PARTS, isTerminal: false, log })
    expect(log).not.toHaveBeenCalled()

    guard.logOnce({ keyParts: KEY_PARTS, isTerminal: true, log })
    expect(log).toHaveBeenCalledTimes(1)
  })

  // One instance per signal, never shared. Three different failures have three different fixes; a
  // shared key set means whichever fires first hides the other two.
  it('gives each instance its own key set, so distinct signals cannot suppress each other', () => {
    const signalA = createLogOnceGuard()
    const signalB = createLogOnceGuard()
    const logA = vi.fn()
    const logB = vi.fn()

    signalA.logOnce({ keyParts: KEY_PARTS, isTerminal: true, log: logA })
    signalB.logOnce({ keyParts: KEY_PARTS, isTerminal: true, log: logB })

    expect(logA).toHaveBeenCalledTimes(1)
    expect(logB).toHaveBeenCalledTimes(1)
  })

  it('reset clears one instance without touching another', () => {
    const signalA = createLogOnceGuard()
    const signalB = createLogOnceGuard()
    const logA = vi.fn()
    const logB = vi.fn()

    signalA.logOnce({ keyParts: KEY_PARTS, isTerminal: true, log: logA })
    signalB.logOnce({ keyParts: KEY_PARTS, isTerminal: true, log: logB })
    signalA.reset()

    signalA.logOnce({ keyParts: KEY_PARTS, isTerminal: true, log: logA })
    signalB.logOnce({ keyParts: KEY_PARTS, isTerminal: true, log: logB })

    expect(logA).toHaveBeenCalledTimes(2)
    expect(logB).toHaveBeenCalledTimes(1)
  })
})
