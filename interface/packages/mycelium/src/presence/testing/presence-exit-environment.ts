type EnvironmentModule = typeof import('@universe/environment')

/**
 * Factory for the caller's own `vi.mock('@universe/environment', ...)`, which
 * must be declared in the test file itself: no exit is observable until
 * `isTestEnv()` reads false. Kept alone in a module with no runtime imports —
 * a factory that reaches anything importing `@universe/environment` (as the
 * exit-lane helper does, via `Presence.web`) deadlocks the test run.
 */
export function presenceExitsEnabledEnvironment(actual: EnvironmentModule): EnvironmentModule {
  return { ...actual, isTestEnv: () => false }
}
