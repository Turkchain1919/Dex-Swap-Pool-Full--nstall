import { ExtensionEventName } from 'uniswap/src/features/telemetry/constants'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InvalidPasswordError, unlockWallet } from 'wallet/src/features/auth/unlockWallet'
import { Keyring } from 'wallet/src/features/wallet/Keyring/Keyring'

vi.mock('wallet/src/features/wallet/Keyring/Keyring', () => ({
  Keyring: { unlock: vi.fn() },
}))
vi.mock('uniswap/src/features/telemetry/send', () => ({
  sendAnalyticsEvent: vi.fn(),
}))

describe('unlockWallet', () => {
  beforeEach(() => {
    vi.mocked(Keyring.unlock).mockReset()
    vi.mocked(sendAnalyticsEvent).mockReset()
  })

  it('unlocks the keyring and reports the state change', async () => {
    vi.mocked(Keyring.unlock).mockResolvedValue(true)

    await expect(unlockWallet({ password: 'dummy-password' })).resolves.toBeUndefined()

    expect(Keyring.unlock).toHaveBeenCalledWith('dummy-password')
    expect(sendAnalyticsEvent).toHaveBeenCalledWith(ExtensionEventName.ChangeLockedState, {
      locked: false,
      location: 'sidebar',
    })
  })

  it('throws InvalidPasswordError and reports nothing when the keyring rejects the password', async () => {
    vi.mocked(Keyring.unlock).mockResolvedValue(false)

    await expect(unlockWallet({ password: 'dummy-password' })).rejects.toBeInstanceOf(InvalidPasswordError)

    expect(sendAnalyticsEvent).not.toHaveBeenCalled()
  })
})
