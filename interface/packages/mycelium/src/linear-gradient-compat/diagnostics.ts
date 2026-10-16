/**
 * Dev diagnostics for the LinearGradient compat legs, on the shared compat
 * warner (`compat/dev-warning.ts`). Platformless so either leg can import it
 * without widening its own export surface (the platform-legs suite pins leg
 * exports as identical).
 */
import { createOneTimeWarner } from '../compat/dev-warning'

const warner = createOneTimeWarner()

/** One-time diagnostic (the Shimmer theme-wiring shape): a silent transparent stop would slip through QA. */
export function warnUnresolvedStopVariable(name: string): void {
  warner.warnOnce(
    name,
    `LinearGradientCompat: theme variable "${name}" did not resolve to a color; rendering that stop as transparent. Check the uniwind theme wiring.`,
  )
}

/** Test-only: clears the one-time guard so suites can assert the warning per case. */
export function __resetLinearGradientStopWarnings(): void {
  warner.reset()
}
