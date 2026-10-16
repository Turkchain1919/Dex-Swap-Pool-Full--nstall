import type { GasFeeResult } from '@universe/api'
import type { UniverseChainId } from '@universe/chains'
import { Flex } from '@universe/mycelium'
import { useMemo } from 'react'
import { EthMethod } from 'uniswap/src/features/dappRequests/types'
import { DappRequestFooter } from 'wallet/src/components/dappRequests/DappRequestFooter'
import { SignatureMessageSection } from 'wallet/src/components/dappRequests/SignatureMessageSection'
import { TransactionLoadingState } from 'wallet/src/components/dappRequests/TransactionLoadingState'
import { TransactionPreviewCard } from 'wallet/src/components/dappRequests/TransactionPreviewCard'
import { useBlockaidJsonRpcScan } from 'wallet/src/features/dappRequests/hooks/useBlockaidJsonRpcScan'
import { usePublishScanGating } from 'wallet/src/features/dappRequests/hooks/usePublishScanGating'
import { TransactionErrorType, TransactionRiskLevel } from 'wallet/src/features/dappRequests/types'
import { parseTransactionSections } from 'wallet/src/features/dappRequests/utils/blockaidUtils'
import { buildBlockaidScanJsonRpcRequest } from 'wallet/src/features/dappRequests/utils/buildBlockaidScanJsonRpcRequest'
import { deriveScanGating } from 'wallet/src/features/dappRequests/utils/scanGating'

interface DappPersonalSignContentProps {
  message: string
  isDecoded?: boolean
  chainId: UniverseChainId
  account: string
  method: EthMethod.PersonalSign | EthMethod.EthSign
  params: unknown[]
  dappUrl: string
  gasFee?: GasFeeResult
  requestMethod?: string
  showSmartWalletActivation?: boolean
  confirmedRisk: boolean
  onConfirmRisk: (confirmed: boolean) => void
  onRiskLevelChange: (riskLevel: TransactionRiskLevel | null) => void
  /**
   * Reports whether the confirm button should get the destructive "critical" styling — true only for
   * a genuine malicious Blockaid verdict, never for a scan-failure caution (which borrows the
   * acknowledgement flow but is not a verdict).
   */
  onCriticalRiskChange?: (isCriticalRisk: boolean) => void
}

/**
 * Component that handles Blockaid scanning and display for personal_sign and eth_sign methods
 */
export function DappPersonalSignContent({
  message,
  isDecoded = true,
  chainId,
  account,
  method,
  params,
  dappUrl,
  gasFee,
  requestMethod,
  showSmartWalletActivation,
  confirmedRisk,
  onConfirmRisk,
  onRiskLevelChange,
  onCriticalRiskChange,
}: DappPersonalSignContentProps): JSX.Element {
  // Build Blockaid scan request
  const blockaidRequest = useMemo(() => {
    return buildBlockaidScanJsonRpcRequest({
      chainId,
      account,
      method,
      params,
      dappUrl,
    })
  }, [chainId, account, method, params, dappUrl])

  // Scan signature with Blockaid
  const { scanResult, isLoading, hasScanFailed, isScanFailurePermanent } = useBlockaidJsonRpcScan(blockaidRequest)

  // Parse the Blockaid scan result to extract risk information
  const { riskLevel } = useMemo(
    () => parseTransactionSections({ scanResult: scanResult ?? null, chainId }),
    [scanResult, chainId],
  )

  const gating = deriveScanGating({
    riskLevel,
    hasScanFailed,
    isScanFailurePermanent,
    isLoading,
    fallbackErrorType: !isDecoded ? TransactionErrorType.DecodeMessage : undefined,
    onConfirmRisk,
  })

  usePublishScanGating({ gating, onRiskLevelChange, onCriticalRiskChange, onConfirmRisk })

  if (isLoading) {
    return <TransactionLoadingState />
  }

  return (
    <Flex gap="$spacing12">
      {/* Signature Preview Card */}
      <TransactionPreviewCard
        sections={[]}
        riskLevel={gating.previewRiskLevel}
        errorType={gating.errorType}
        chainId={chainId}
      >
        <SignatureMessageSection message={message} isDecoded={isDecoded} />
      </TransactionPreviewCard>

      <DappRequestFooter
        chainId={chainId}
        account={account}
        riskLevel={gating.footerRiskLevel}
        confirmedRisk={confirmedRisk}
        gasFee={gasFee}
        requestMethod={requestMethod}
        showSmartWalletActivation={showSmartWalletActivation}
        scanFailureError={gating.scanFailureError}
        onConfirmRisk={gating.onConfirmRisk}
      />
    </Flex>
  )
}
