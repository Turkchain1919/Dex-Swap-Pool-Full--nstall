/**
 * Development semantics, NOT `__DEV__` (review round 3): `__DEV__` is true in
 * deployed staging/previews/ECS (`vite build --mode staging` defines it from
 * `!isProduction`), so gating a render-body throw on it would white-screen
 * real deployments. `NodeEnv.Development` is 'development' exactly on a real
 * dev server (`vite dev` / `wxt dev` / react-router dev) and `NodeEnv.Test`
 * under the test runners; every other build (staging, production) reads as
 * neither. The try/catch makes a config-validation failure (or any other
 * `getConfig()` throw) fail CLOSED into production keep-and-warn: a render
 * must never crash over a possibly-unstyled element.
 */
import { getConfig, NodeEnv } from '@universe/config'

export function isDevelopmentBuild(): boolean {
  try {
    // getConfig() is @deprecated, but it's used deliberately here (review):
    // reading `process.env` directly is banned repo-wide, and this is the
    // same primitive @universe/environment's own dev/test gate is built on
    // (env.web.ts).
    const nodeEnv = getConfig().nodeEnv
    return nodeEnv === NodeEnv.Development || nodeEnv === NodeEnv.Test
  } catch {
    return false
  }
}
