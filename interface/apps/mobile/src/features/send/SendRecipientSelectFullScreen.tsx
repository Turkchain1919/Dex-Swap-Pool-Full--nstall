import { UniverseChainId } from '@universe/chains'
import { Flex } from '@universe/mycelium'
import React, { useCallback, useEffect, useState } from 'react'
import { RecipientSelect } from 'src/components/RecipientSelect/RecipientSelect'
import type { EIP681URI } from 'src/components/Requests/ScanSheet/util'
import { SEND_CONTENT_RENDER_DELAY_MS } from 'src/features/send/constants'
import { TransactionModalInnerContainer } from 'uniswap/src/features/transactions/components/TransactionModal/TransactionModal'
import { useTransactionModalContext } from 'uniswap/src/features/transactions/components/TransactionModal/TransactionModalContext'
import { useSendContext } from 'wallet/src/features/transactions/contexts/SendContext'

// We add a short hardcoded delay to allow the sheet to animate quickly both on first render and when going back from Review -> Form.
export function SendRecipientSelectFullScreen({
  onQrCodeSelectionChange,
}: {
  onQrCodeSelectionChange: (paymentRequest?: EIP681URI) => void
}): JSX.Element {
  const [hideContent, setHideContent] = useState(true)
  useEffect(() => {
    setTimeout(() => setHideContent(false), SEND_CONTENT_RENDER_DELAY_MS)
  }, [])

  return (
    <SendRecipientSelectFullScreenContent hideContent={hideContent} onQrCodeSelectionChange={onQrCodeSelectionChange} />
  )
}

function SendRecipientSelectFullScreenContent({
  hideContent,
  onQrCodeSelectionChange,
}: {
  hideContent: boolean
  onQrCodeSelectionChange: (paymentRequest?: EIP681URI) => void
}): JSX.Element {
  const { bottomSheetViewStyles } = useTransactionModalContext()
  const { recipient, derivedSendInfo, updateSendForm } = useSendContext()

  const onSelectRecipient = useCallback(
    (newRecipient: string, paymentRequest?: EIP681URI) => {
      onQrCodeSelectionChange(paymentRequest)
      updateSendForm({ recipient: newRecipient, showRecipientSelector: false })
    },
    [onQrCodeSelectionChange, updateSendForm],
  )

  const onHideRecipientSelector = useCallback(() => {
    updateSendForm({ showRecipientSelector: false })
  }, [updateSendForm])

  return (
    <TransactionModalInnerContainer fullscreen bottomSheetViewStyles={bottomSheetViewStyles}>
      {!hideContent && (
        <>
          <Flex height="$spacing12" />
          <RecipientSelect
            chainId={derivedSendInfo.chainId as UniverseChainId}
            recipient={recipient}
            onHideRecipientSelector={onHideRecipientSelector}
            onSelectRecipient={onSelectRecipient}
          />
        </>
      )}
    </TransactionModalInnerContainer>
  )
}
