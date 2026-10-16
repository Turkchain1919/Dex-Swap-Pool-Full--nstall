import { getWalletLabelError } from 'src/app/features/accounts/useWalletLabelField'
import { NICKNAME_MAX_LENGTH } from 'wallet/src/constants/accounts'

const t = ((key: string, options?: { max?: number }) => {
  if (key === 'account.wallet.edit.label.error.max') {
    return `Wallet label must be ${options?.max} characters or less`
  }
  return key
}) as Parameters<typeof getWalletLabelError>[1]

describe('getWalletLabelError', () => {
  it('returns undefined when the label is within the max length', () => {
    expect(getWalletLabelError('a'.repeat(NICKNAME_MAX_LENGTH), t)).toBeUndefined()
  })

  it('returns the max-length error when the label is too long', () => {
    expect(getWalletLabelError('a'.repeat(NICKNAME_MAX_LENGTH + 1), t)).toBe(
      `Wallet label must be ${NICKNAME_MAX_LENGTH} characters or less`,
    )
  })
})
