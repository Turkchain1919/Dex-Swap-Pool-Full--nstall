import { isDevEnv } from '@universe/environment'
import {
  IMPERSONATION_SIGNING_ERROR_MESSAGE,
  impersonatedSigningError,
  isImpersonatedAccount,
  isImpersonatedSigningError,
} from 'src/app/features/accounts/impersonation'
import { AccountType } from 'uniswap/src/features/accounts/types'

vi.mock('@universe/environment', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@universe/environment')>()),
  isDevEnv: vi.fn(() => true),
}))

const mockIsDevEnv = vi.mocked(isDevEnv)

describe('isImpersonatedAccount', () => {
  beforeEach(() => {
    mockIsDevEnv.mockReturnValue(true)
  })

  it('is true for a view-only account in a dev build', () => {
    expect(isImpersonatedAccount({ type: AccountType.Readonly })).toBe(true)
  })

  it('is false for a signer account', () => {
    expect(isImpersonatedAccount({ type: AccountType.SignerMnemonic })).toBe(false)
  })

  it('is false when there is no account', () => {
    expect(isImpersonatedAccount(undefined)).toBe(false)
    expect(isImpersonatedAccount(null)).toBe(false)
  })

  it('is false outside a dev build, so shipped builds keep the view-only guards', () => {
    mockIsDevEnv.mockReturnValue(false)

    expect(isImpersonatedAccount({ type: AccountType.Readonly })).toBe(false)
  })
})

describe('impersonatedSigningError', () => {
  beforeEach(() => {
    mockIsDevEnv.mockReturnValue(true)
  })

  it('is an unauthorized rpc error the dapp can read', () => {
    const error = impersonatedSigningError()

    expect(error.message).toBe(IMPERSONATION_SIGNING_ERROR_MESSAGE)
    expect((error as { code?: number }).code).toBe(4100)
  })

  it('is recognizable, and other errors are not mistaken for it', () => {
    mockIsDevEnv.mockReturnValue(true)

    expect(isImpersonatedSigningError(impersonatedSigningError())).toBe(true)
    expect(isImpersonatedSigningError(new Error('boom'))).toBe(false)
    expect(isImpersonatedSigningError(undefined)).toBe(false)
    expect(isImpersonatedSigningError({ data: {} })).toBe(false)
  })

  it('is not recognized outside a dev build, keeping error reporting live in shipped builds', () => {
    mockIsDevEnv.mockReturnValue(false)

    expect(isImpersonatedSigningError(impersonatedSigningError())).toBe(false)
  })
})
