import type { BlockaidScanJsonRpcRequest, GasFeeResult } from '@universe/api'
import type { UniverseChainId } from '@universe/chains'
import { Flex } from '@universe/mycelium'
import { useMemo } from 'react'
import { DappRequestFooter } from 'wallet/src/components/dappRequests/DappRequestFooter'
import { isV3NonfungiblePositionManager } from 'wallet/src/components/dappRequests/DappSendCallsScanningContent'
import { useTypedDataWarningConfirmation } from 'wallet/src/components/dappRequests/hooks/useTypedDataWarningConfirmation'
import { NFTPermitContent } from 'wallet/src/components/dappRequests/SignTypedData/NFTPermitContent'
import { NonStandardTypedDataContent } from 'wallet/src/components/dappRequests/SignTypedData/NonStandardTypedDataContent'
import { Permit2Content } from 'wallet/src/components/dappRequests/SignTypedData/Permit2Content'
import { StandardTypedDataContent } from 'wallet/src/components/dappRequests/SignTypedData/StandardTypedDataContent'
import { TransactionLoadingState } from 'wallet/src/components/dappRequests/TransactionLoadingState'
import { TransactionPreviewCard } from 'wallet/src/components/dappRequests/TransactionPreviewCard'
import {
  type EIP712DomainType,
  type EIP712Message,
  isEIP712TypedData,
} from 'wallet/src/components/dappRequests/types/EIP712Types'
import { isPermit2 } from 'wallet/src/components/dappRequests/types/Permit2Types'
import { usePublishScanGating } from 'wallet/src/features/dappRequests/hooks/usePublishScanGating'
import { useTypedDataSections } from 'wallet/src/features/dappRequests/hooks/useTypedDataSections'
import { TransactionRiskLevel } from 'wallet/src/features/dappRequests/types'
import { deriveScanGating } from 'wallet/src/features/dappRequests/utils/scanGating'

interface DappSignTypedDataContentProps {
  typedData: string
  chainId: UniverseChainId
  account: string
  method: BlockaidScanJsonRpcRequest['data']['method']
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
 * Component that handles Blockaid scanning and display for eth_signTypedData methods
 * Supports permit2, nonstandard, standard typed data formats, and UniswapX swaps
 */
export function DappSignTypedDataContent({
  typedData,
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
}: DappSignTypedDataContentProps): JSX.Element {
  // Parse typed data
  const parsedTypedData = useMemo((): unknown => {
    try {
      return JSON.parse(typedData) as unknown
    } catch {
      return null
    }
  }, [typedData])

  // Detect NFT permit (V3 position approval) for enriched rendering
  const nftPermitInfo = useMemo(():
    | { contractAddress: string | undefined; tokenId: string; domain: EIP712DomainType; message: EIP712Message }
    | undefined => {
    if (!isEIP712TypedData(parsedTypedData)) {
      return undefined
    }
    if (parsedTypedData.primaryType !== 'Permit' || parsedTypedData.message['tokenId'] === undefined) {
      return undefined
    }
    const contractAddress = parsedTypedData.domain?.verifyingContract
    if (!isV3NonfungiblePositionManager(contractAddress, chainId)) {
      return undefined
    }
    return {
      contractAddress,
      tokenId: String(parsedTypedData.message['tokenId']),
      domain: parsedTypedData.domain || {},
      message: parsedTypedData.message,
    }
  }, [parsedTypedData, chainId])

  // Get transaction sections - handles both UniswapX and regular typed data via Blockaid
  const { sections, riskLevel, isLoading, hasScanFailed, isScanFailurePermanent } = useTypedDataSections({
    parsedTypedData,
    chainId,
    account,
    method,
    params,
    dappUrl,
  })

  const hasAssetChanges = sections.length > 0

  const isNonStandard = !isEIP712TypedData(parsedTypedData)

  const gating = deriveScanGating({
    riskLevel,
    hasScanFailed,
    isScanFailurePermanent,
    isLoading,
    onConfirmRisk,
  })

  // Manage warning confirmations for non-standard and risk-based warnings. Passing the gated
  // callback keeps the in-card acknowledgement from publishing a confirmation the footer refuses.
  const { confirmedNonStandard, confirmedRiskWarning, handleNonStandardConfirm, handleRiskConfirm } =
    useTypedDataWarningConfirmation({
      isNonStandard,
      // Use the gated risk level: a scan failure raises this to Critical, so a non-standard request
      // whose scan failed still requires the "Safety check unavailable" acknowledgement rather than
      // letting the in-card irregular-signature checkbox alone publish a confirmation.
      riskLevel: gating.footerRiskLevel,
      confirmedRisk,
      onConfirmRisk: gating.onConfirmRisk,
    })

  // Reset through `handleRiskConfirm`, not the raw `onConfirmRisk`: this surface's risk acknowledgement
  // lives in `useTypedDataWarningConfirmation` (`confirmedRiskWarning`), and when the merged parent flag
  // is already false (non-standard request, irregular box unticked) resetting the parent prop is a no-op
  // that leaves the risk box pre-checked across a scan-failure→verdict transition.
  usePublishScanGating({ gating, onRiskLevelChange, onCriticalRiskChange, onConfirmRisk: handleRiskConfirm })

  if (isLoading) {
    return <TransactionLoadingState />
  }

  // Render appropriate content based on typed data type
  const renderTypedDataContent = (): JSX.Element => {
    if (isNonStandard) {
      return (
        <NonStandardTypedDataContent
          typedData={typedData}
          checked={confirmedNonStandard}
          onCheckedChange={handleNonStandardConfirm}
        />
      )
    }

    if (isPermit2(parsedTypedData)) {
      return <Permit2Content typedData={typedData} />
    }

    if (nftPermitInfo) {
      return <NFTPermitContent domain={nftPermitInfo.domain} message={nftPermitInfo.message} chainId={chainId} />
    }

    return <StandardTypedDataContent domain={parsedTypedData.domain || {}} message={parsedTypedData.message} />
  }

  return (
    <Flex gap="$spacing12">
      <TransactionPreviewCard
        sections={sections}
        riskLevel={gating.previewRiskLevel}
        errorType={gating.errorType}
        chainId={chainId}
      >
        {!hasAssetChanges && renderTypedDataContent()}
      </TransactionPreviewCard>

      <DappRequestFooter
        chainId={chainId}
        account={account}
        riskLevel={gating.footerRiskLevel}
        gasFee={gasFee}
        requestMethod={requestMethod}
        showSmartWalletActivation={showSmartWalletActivation}
        confirmedRisk={confirmedRiskWarning}
        scanFailureError={gating.scanFailureError}
        onConfirmRisk={handleRiskConfirm}
      />
    </Flex>
  )
}
