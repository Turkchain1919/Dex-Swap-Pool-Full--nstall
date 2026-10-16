/**
 * Drift guard for the smallFont gate on the native style lane.
 *
 * `native-font-environment.native.ts` gates the +1 `adjustedSize` bump on
 * Mycelium's `needsSmallFont` copy (../segmented-control-compat), while legacy
 * `ui/src/theme/fonts.ts` gates its bump on `ui/src/utils/needs-small-font`.
 * Mycelium can't import the ui implementation at runtime (no `ui` dependency —
 * it would drag Tamagui into the graph; ui/src is reachable from tests only,
 * the tokens.parity.test.ts arrangement), so the copy can drift silently: any
 * locale where the two conditions disagree renders converted Text 1pt off
 * legacy. This sweep pins the copy to legacy behaviorally.
 *
 * Both `.native` legs are imported explicitly — the jsdom config resolves
 * `.web` first, and the web stubs are constant-true, which would make an
 * equality sweep vacuously pass. The zh/ja/en literal pins prove the sweep
 * exercises the real locale-dependent implementations, not the stubs.
 */
import { needsSmallFont as legacyNeedsSmallFont } from 'ui/src/utils/needs-small-font.native'
import type { DeviceLocale } from 'utilities/src/device/constants'
import { describe, expect, it, vi } from 'vitest'
import { needsSmallFont as myceliumNeedsSmallFont } from '../segmented-control-compat/needs-small-font.native'

const mockState = vi.hoisted(() => ({ locales: [] as { languageCode: string | null; languageTag: string }[] }))

vi.mock('utilities/src/device/locales', () => ({
  getDeviceLocales: (): DeviceLocale[] => mockState.locales,
}))

// The wiring test imports native-font-environment.native, whose extensionless
// needs-small-font import would otherwise resolve to the constant-true web
// stub under this jsdom config's `.web`-first resolution.
vi.mock(
  '../segmented-control-compat/needs-small-font',
  () => import('../segmented-control-compat/needs-small-font.native'),
)
vi.mock('react-native', () => import('../compat/testing/react-native-mock'))

function setDeviceLanguage(languageCode: string | null): void {
  mockState.locales = [{ languageCode, languageTag: languageCode ?? 'und' }]
}

// Every language code the app ships (the `Language` enum in
// uniswap/src/features/language/constants.ts, collapsed to device
// languageCode) plus the null edge; the no-locale edge gets its own case.
const LANGUAGE_CODE_SWEEP: readonly (string | null)[] = [
  'zh',
  'zh-Hant',
  'nl',
  'en',
  'fr',
  'id',
  'ja',
  'ko',
  'pt',
  'ru',
  'es',
  'es-419',
  'tr',
  'vi',
  null,
]

describe('needsSmallFont drift guard against ui/src/utils/needs-small-font (legacy fonts.ts gate)', () => {
  it('pins the known CJK split, proving the native legs (not the constant-true stubs) are under test', () => {
    setDeviceLanguage('zh')
    expect(myceliumNeedsSmallFont()).toBe(true)
    setDeviceLanguage('ja')
    expect(myceliumNeedsSmallFont()).toBe(true)
    setDeviceLanguage('en')
    expect(myceliumNeedsSmallFont()).toBe(false)
  })

  it('agrees with legacy on every shipped language code', () => {
    for (const languageCode of LANGUAGE_CODE_SWEEP) {
      setDeviceLanguage(languageCode)
      expect(myceliumNeedsSmallFont(), `languageCode ${String(languageCode)}`).toBe(legacyNeedsSmallFont())
    }
  })

  it('agrees with legacy when the device reports no locales', () => {
    mockState.locales = []
    expect(myceliumNeedsSmallFont()).toBe(legacyNeedsSmallFont())
  })
})

describe('native-font-environment wiring', () => {
  it('smallFont carries needsSmallFont, evaluated at module init', async () => {
    setDeviceLanguage('ja')
    vi.resetModules()
    const jaEnv = (await import('./native-font-environment.native')).nativeFontEnvironment()
    expect(jaEnv.smallFont).toBe(true)

    setDeviceLanguage('en')
    vi.resetModules()
    const enEnv = (await import('./native-font-environment.native')).nativeFontEnvironment()
    expect(enEnv.smallFont).toBe(false)
  })
})
