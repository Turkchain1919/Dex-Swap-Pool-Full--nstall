import { configureStore } from '@reduxjs/toolkit'
import { useQueryClient } from '@tanstack/react-query'
import { waitFor } from '@testing-library/react'
import { useUnlockWithPassword } from 'src/app/features/lockScreen/useUnlockWithPassword'
import { extensionReducer } from 'src/store/extensionReducer'
import type { AppStore } from 'src/store/store'
import { renderHookWithProviders } from 'src/test/render'
import { logger } from 'utilities/src/logger/logger'
import { InvalidPasswordError } from 'wallet/src/features/auth/unlockWallet'
import { Keyring } from 'wallet/src/features/wallet/Keyring/Keyring'

vi.mock('wallet/src/features/wallet/Keyring/Keyring', () => ({
  Keyring: { unlock: vi.fn() },
}))
vi.mock('uniswap/src/features/telemetry/send', () => ({
  sendAnalyticsEvent: vi.fn(),
}))
vi.mock('utilities/src/logger/logger', () => ({
  logger: { error: vi.fn() },
}))

const PASSWORD = 'dummy-password-never-in-redux'

function createRecordingStore(): { store: AppStore; dispatched: unknown[] } {
  const store: AppStore = configureStore({
    reducer: extensionReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
  })
  const dispatched: unknown[] = []
  vi.spyOn(store, 'dispatch').mockImplementation((action) => {
    dispatched.push(action)
    return action
  })
  return { store, dispatched }
}

describe('useUnlockWithPassword', () => {
  beforeEach(() => {
    vi.mocked(Keyring.unlock).mockReset()
    vi.mocked(logger.error).mockReset()
  })

  it('unlocks the keyring without the password touching redux', async () => {
    vi.mocked(Keyring.unlock).mockResolvedValue(true)
    const { store, dispatched } = createRecordingStore()

    const { result } = renderHookWithProviders(() => useUnlockWithPassword(PASSWORD), { store })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(Keyring.unlock).toHaveBeenCalledWith(PASSWORD)
    expect(JSON.stringify(dispatched)).not.toContain(PASSWORD)
    expect(JSON.stringify(store.getState())).not.toContain(PASSWORD)
  })

  it('keeps the password out of the react-query mutation cache', async () => {
    vi.mocked(Keyring.unlock).mockResolvedValue(true)

    const { result } = renderHookWithProviders(() => ({
      unlock: useUnlockWithPassword(PASSWORD),
      queryClient: useQueryClient(),
    }))
    result.current.unlock.mutate()

    await waitFor(() => expect(result.current.unlock.isSuccess).toBe(true))

    // Mutation variables outlive the lock screen (default gcTime is 5 minutes), so nothing sensitive may be in them.
    const cachedStates = result.current.queryClient
      .getMutationCache()
      .getAll()
      .map((mutation) => mutation.state)
    expect(cachedStates.length).toBeGreaterThan(0)
    expect(JSON.stringify(cachedStates)).not.toContain(PASSWORD)
    expect(result.current.unlock.variables).toBeUndefined()
  })

  it('unlocks with the password from the latest render', async () => {
    vi.mocked(Keyring.unlock).mockResolvedValue(true)

    const { result, rerender } = renderHookWithProviders((password: string) => useUnlockWithPassword(password), {
      initialProps: 'first-attempt',
    })
    rerender(PASSWORD)
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(Keyring.unlock).toHaveBeenCalledTimes(1)
    expect(Keyring.unlock).toHaveBeenCalledWith(PASSWORD)
  })

  it('surfaces a wrong password as InvalidPasswordError and does not log it', async () => {
    vi.mocked(Keyring.unlock).mockResolvedValue(false)

    const { result } = renderHookWithProviders(() => useUnlockWithPassword(PASSWORD))
    result.current.mutate()

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(InvalidPasswordError)
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('logs unexpected failures', async () => {
    const failure = new Error('storage unavailable')
    vi.mocked(Keyring.unlock).mockRejectedValue(failure)

    const { result } = renderHookWithProviders(() => useUnlockWithPassword(PASSWORD))
    result.current.mutate()

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBe(failure)
    expect(logger.error).toHaveBeenCalledWith(failure, expect.anything())
  })
})
