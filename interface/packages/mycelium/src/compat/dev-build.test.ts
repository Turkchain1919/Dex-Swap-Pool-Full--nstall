/**
 * `isDevelopmentBuild()` exercised against the REAL `@universe/config`
 * (INFRA-3260 review): every other compat test file mocks `getConfig()` to
 * control the dev/test throw gate, so nothing pins that the primitive itself
 * actually resolves through a real `getConfig()` call. Vitest sets
 * `process.env.NODE_ENV` to `'test'` ambiently (no config here stubs it),
 * which `NodeEnv.Test` is one of the two truthy branches for — asserting
 * both together catches a change to either side (the ambient env or the
 * primitive) silently drifting apart.
 */
import { describe, expect, it } from 'vitest'
import { isDevelopmentBuild } from './dev-build'

describe('isDevelopmentBuild — unmocked getConfig() (INFRA-3260 review)', () => {
  it('resolves true under vitest real ambient NODE_ENV', () => {
    expect(process.env['NODE_ENV']).toBe('test')
    expect(isDevelopmentBuild()).toBe(true)
  })
})
