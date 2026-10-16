/**
 * Dev-only uniwind class-map-miss loudness (INFRA-3238).
 *
 * uniwind's native store silently skips className tokens without a stylesheet
 * entry (`if (!(className in this.stylesheet)) continue` —
 * uniwind/src/core/native/store.ts), so a typo, a scanner-invisible
 * runtime-composed class, and a web-only utility all no-op identically on
 * device. uniwind exposes no public hook for this, so in `__DEV__` this wraps
 * the store's `getStyles` with a one-shot warner. Classification (including
 * the allowlist of structurally-unreachable variant families like `hover:` /
 * `group-*` / `focus-visible:`) lives in `@universe/tailwind`, where the
 * native parity suite pins it against uniwind's real compiled class map.
 *
 * Every uniwind internal touched here is shape-checked before use: if a
 * uniwind version bump moves the store or its stylesheet map, the diagnostic
 * disables itself instead of breaking the app.
 */
import { createNativeClassMapMissWarner } from '@universe/tailwind/native-dev/class-map-miss'

interface UniwindStoreShape {
  getStyles: (...args: unknown[]) => unknown
  stylesheet: object
}

function resolveUniwindStore(): UniwindStoreShape | undefined {
  let core: unknown
  try {
    // uniwind@1.7.0 keeps its native store internal (not in its `exports`
    // map); Metro resolves the path anyway, and the same module instance backs
    // the public runtime, so the wrap sees every resolved className.
    // oxlint-disable-next-line typescript/no-var-requires -- see try/catch: an import would hard-fail typecheck/bundling if uniwind moves the internal, a guarded require degrades to "no diagnostic"
    core = require('uniwind/src/core/native') as unknown
  } catch {
    return undefined
  }
  if (typeof core !== 'object' || core === null) {
    return undefined
  }
  const store = (core as { UniwindStore?: unknown }).UniwindStore
  if (typeof store !== 'object' || store === null) {
    return undefined
  }
  if (typeof (store as { getStyles?: unknown }).getStyles !== 'function') {
    return undefined
  }
  const stylesheet = (store as { stylesheet?: unknown }).stylesheet
  if (typeof stylesheet !== 'object' || stylesheet === null) {
    // Without the stylesheet map every lookup would read as a miss — one bogus
    // warning per class. Self-disable instead, per the module contract above.
    return undefined
  }
  return store as UniwindStoreShape
}

let installed = false

/**
 * Install the `__DEV__` class-map-miss warning. Idempotent; a release build or
 * an unrecognized uniwind internal shape makes it a no-op.
 */
export function installUniwindClassMapMissDevWarning(): void {
  if (!__DEV__ || installed) {
    return
  }
  installed = true
  const store = resolveUniwindStore()
  if (store === undefined) {
    return
  }
  const warnMisses = createNativeClassMapMissWarner({
    hasClass: (token) => token in store.stylesheet,
    // oxlint-disable-next-line no-console -- __DEV__-only diagnostic; the alternative is a silently missing style (uniwind drops unknown classes without any signal)
    warn: (message) => console.warn(message),
  })
  const originalGetStyles = store.getStyles.bind(store)
  try {
    store.getStyles = (...args: unknown[]): unknown => {
      const [className] = args
      if (typeof className === 'string') {
        try {
          warnMisses(className)
        } catch {
          // A post-install swap of `store.stylesheet` to a non-object must
          // degrade to "no diagnostic", never throw inside every getStyles.
        }
      }
      return originalGetStyles(...args)
    }
  } catch {
    // A frozen or getter-only store (a future uniwind hardening) must degrade
    // to "no diagnostic", never crash dev at import.
  }
}
