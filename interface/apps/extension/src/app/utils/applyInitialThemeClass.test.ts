import { applyInitialThemeClass, isDarkFromPersistedState } from 'src/app/utils/applyInitialThemeClass'
import { STATE_STORAGE_KEY } from 'src/store/constants'
import { AppearanceSettingType } from 'uniswap/src/features/appearance/slice'
import type { Mock } from 'vitest'

const mockStorageGet = chrome.storage.local.get as Mock

function persistedStateWith(setting: AppearanceSettingType): string {
  return JSON.stringify({ appearanceSettings: JSON.stringify({ selectedAppearanceSettings: setting }) })
}

describe('isDarkFromPersistedState', () => {
  it('returns true for an explicit dark setting regardless of the OS preference', () => {
    const persistedState = persistedStateWith(AppearanceSettingType.Dark)
    expect(isDarkFromPersistedState({ persistedState, prefersDark: false })).toBe(true)
    expect(isDarkFromPersistedState({ persistedState, prefersDark: true })).toBe(true)
  })

  it('returns false for an explicit light setting regardless of the OS preference', () => {
    const persistedState = persistedStateWith(AppearanceSettingType.Light)
    expect(isDarkFromPersistedState({ persistedState, prefersDark: false })).toBe(false)
    expect(isDarkFromPersistedState({ persistedState, prefersDark: true })).toBe(false)
  })

  it('follows the OS preference for the system setting', () => {
    const persistedState = persistedStateWith(AppearanceSettingType.System)
    expect(isDarkFromPersistedState({ persistedState, prefersDark: false })).toBe(false)
    expect(isDarkFromPersistedState({ persistedState, prefersDark: true })).toBe(true)
  })

  it('follows the OS preference when no state is persisted', () => {
    expect(isDarkFromPersistedState({ persistedState: undefined, prefersDark: true })).toBe(true)
    expect(isDarkFromPersistedState({ persistedState: undefined, prefersDark: false })).toBe(false)
  })

  it.each([
    ['not json', 'not json'],
    ['a non-object root', '"string"'],
    ['a missing appearanceSettings slice', JSON.stringify({ other: '{}' })],
    ['a non-string appearanceSettings slice', JSON.stringify({ appearanceSettings: 1 })],
    ['a malformed appearanceSettings slice', JSON.stringify({ appearanceSettings: 'not json' })],
  ])('follows the OS preference for %s', (_label, persistedState) => {
    expect(isDarkFromPersistedState({ persistedState, prefersDark: true })).toBe(true)
    expect(isDarkFromPersistedState({ persistedState, prefersDark: false })).toBe(false)
  })
})

describe('applyInitialThemeClass', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('adds the root dark class when the persisted setting is dark', async () => {
    mockStorageGet.mockResolvedValueOnce({
      [STATE_STORAGE_KEY]: persistedStateWith(AppearanceSettingType.Dark),
    })

    await applyInitialThemeClass()

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('leaves the root dark class off when the persisted setting is light', async () => {
    mockStorageGet.mockResolvedValueOnce({
      [STATE_STORAGE_KEY]: persistedStateWith(AppearanceSettingType.Light),
    })

    await applyInitialThemeClass()

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('does not reject when the storage read fails', async () => {
    mockStorageGet.mockRejectedValueOnce(new Error('storage unavailable'))

    await expect(applyInitialThemeClass()).resolves.toBeUndefined()

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
