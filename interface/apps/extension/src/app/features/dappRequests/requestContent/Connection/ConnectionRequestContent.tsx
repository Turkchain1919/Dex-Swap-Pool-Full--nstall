import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { isImpersonatedAccount } from 'src/app/features/accounts/impersonation'
import { updateDappConnectedAddressFromExtension } from 'src/app/features/dapp/actions'
import { DappRequestContent } from 'src/app/features/dappRequests/DappRequestContent'
import { useDappRequestQueueContext } from 'src/app/features/dappRequests/DappRequestQueueContext'
import { AccountType } from 'uniswap/src/features/accounts/types'
import { logger } from 'utilities/src/logger/logger'
import { useEvent } from 'utilities/src/react/hooks'
import { DappConnectionContent } from 'wallet/src/components/dappRequests/DappConnectionContent'
import { useBlockaidVerification } from 'wallet/src/features/dappRequests/hooks/useBlockaidVerification'
import { useDappConnectionConfirmation } from 'wallet/src/features/dappRequests/hooks/useDappConnectionConfirmation'
import { DappVerificationStatus } from 'wallet/src/features/dappRequests/types'
import { applyFirstPartyOverride, isFirstPartyDapp } from 'wallet/src/features/dappRequests/verification'
import { useActiveAccountWithThrow, useSignerAccounts } from 'wallet/src/features/wallet/hooks'
import { setAccountAsActive } from 'wallet/src/features/wallet/slice'

export function ConnectionRequestContent(): JSX.Element {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { currentAccount, dappUrl, request, onConfirm } = useDappRequestQueueContext()
  const { verificationStatus: blockaidStatus } = useBlockaidVerification(dappUrl)
  const activeAccount = useActiveAccountWithThrow()
  const signerAccounts = useSignerAccounts()
  const [selectedAccountAddresses, setSelectedAccountAddresses] = useState([currentAccount.address])

  // Apply the first-party override even when Blockaid is loading or unavailable (blockaidStatus is undefined),
  // defaulting to Unverified — consistent with how mergeVerificationStatuses treats missing signals on mobile.
  const verificationStatus = applyFirstPartyOverride(blockaidStatus ?? DappVerificationStatus.Unverified, dappUrl)

  const isViewOnly = currentAccount.type === AccountType.Readonly
  // A dev-impersonated wallet is allowed to connect so the dapp flow can be exercised end to end.
  // The view-only treatment below is deliberately left on, so the request still reads as not-a-real-wallet.
  const isImpersonated = isImpersonatedAccount(currentAccount)
  const { confirmedWarning, setConfirmedWarning, disableConfirm } = useDappConnectionConfirmation({
    verificationStatus,
    isViewOnly: isViewOnly && !isImpersonated,
  })

  const allAccountAddresses = useMemo(() => signerAccounts.map((account) => account.address), [signerAccounts])
  const selectedAddress = selectedAccountAddresses[0]

  const handleConfirm = useEvent(async () => {
    if (!request || !selectedAddress) {
      return
    }

    if (selectedAddress !== activeAccount.address) {
      dispatch(setAccountAsActive(selectedAddress))
    }

    try {
      if (selectedAddress !== currentAccount.address) {
        await updateDappConnectedAddressFromExtension(selectedAddress)
      }
    } catch (error) {
      logger.error(error, { tags: { file: 'ConnectionRequestContent', function: 'handleConfirm' } })
    }

    await onConfirm({ request })
  })

  return (
    <DappRequestContent
      confirmText={t('common.button.connect')}
      title={t('dapp.request.connect.title')}
      verificationStatus={verificationStatus}
      isFirstParty={isFirstPartyDapp(dappUrl)}
      disableConfirm={disableConfirm}
      showAddressFooter={isViewOnly}
      onConfirm={handleConfirm}
    >
      <DappConnectionContent
        verificationStatus={verificationStatus}
        confirmedWarning={confirmedWarning}
        onConfirmWarning={setConfirmedWarning}
        isViewOnly={isViewOnly}
        placement="bottom-end"
        allAccountAddresses={allAccountAddresses}
        selectedAccountAddresses={selectedAccountAddresses}
        setSelectedAccountAddresses={setSelectedAccountAddresses}
      />
    </DappRequestContent>
  )
}
