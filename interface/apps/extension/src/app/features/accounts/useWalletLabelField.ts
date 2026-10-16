import type { TFunction } from 'i18next'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NICKNAME_MAX_LENGTH } from 'wallet/src/constants/accounts'

/**
 * Validates a manual wallet label, returning the first translated error found, or `undefined` when
 * the label is valid.
 */
export function getWalletLabelError(value: string, t: TFunction): string | undefined {
  if (value.length > NICKNAME_MAX_LENGTH) {
    return t('account.wallet.edit.label.error.max', { max: NICKNAME_MAX_LENGTH })
  }

  return undefined
}

export function useWalletLabelField(initialValue = ''): {
  value: string
  setValue: (value: string) => void
  error: string | undefined
} {
  const { t } = useTranslation()
  const [value, setValue] = useState(initialValue)
  const error = getWalletLabelError(value, t)

  return { value, setValue, error }
}
