/**
 * The PLATFORMLESS BASE stubs of the theme-hooks compat must fail loudly —
 * they exist for the bundler's platform resolution (`.web` / `.native` are
 * the real legs; the base file owns shared types) and reaching one at runtime
 * means a bundler is misconfigured. These tests pin that contract.
 *
 * The native legs are real implementations since INFRA-2353 (the native
 * parity harness proves them in packages/tailwind/src/parity/theme-hooks/
 * native-parity.test.ts under `nx run tailwind:test:native`); the previous
 * version of this file pinned their pre-harness throwing stubs.
 */
import { PlatformSplitStubError } from '@universe/environment'
import { describe, expect, it } from 'vitest'
// Explicit `.ts` extensions are load-bearing: the mycelium vitest config
// resolves `.web.ts` platform splits first, so an extensionless `./useMedia`
// would import the real web leg. These tests pin the platformless BASE files,
// and an exact-path specifier is the only resolver-proof way to reach them.
import { opacify, opacifyRaw } from './opacify.ts'
import { useDeviceDimensions } from './useDeviceDimensions.ts'
import { useIsDarkMode } from './useIsDarkMode.ts'
import { useIsTouchDevice } from './useIsTouchDevice.ts'
import { useMedia } from './useMedia.ts'
import { useSporeColors } from './useSporeColors.ts'

const BASE_STUBS: ReadonlyArray<[string, () => unknown]> = [
  ['useSporeColors', () => useSporeColors()],
  ['useIsDarkMode', () => useIsDarkMode()],
  ['useIsTouchDevice', () => useIsTouchDevice()],
  ['useMedia', () => useMedia()],
  ['useDeviceDimensions', () => useDeviceDimensions()],
  ['opacify', () => opacify(50, '#FFFFFF')],
  ['opacifyRaw', () => opacifyRaw(50, '#FFFFFF')],
]

describe('theme-hooks compat base stubs', () => {
  it.each(BASE_STUBS)('%s base stub throws the platform-override contract', (_name, call) => {
    expect(call).toThrowError(PlatformSplitStubError)
    expect(call).toThrowError(/Did you forget a platform override\?/)
  })
})
