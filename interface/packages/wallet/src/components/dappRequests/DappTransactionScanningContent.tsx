import type { BlockaidScanTransactionRequest, GasFeeResult } from '@universe/api'
import { getValidAddress, Platform, type UniverseChainId } from '@universe/chains'
import { Flex } from '@universe/mycelium'
import { useMemo } from 'react'
import type { GasFeeOverrides } from 'uniswap/src/features/gas/types'
import type { EthTransaction } from 'uniswap/src/types/walletConnect'
import { logger } from 'utilities/src/logger/logger'
import { DappRequestFooter } from 'wallet/src/components/dappRequests/DappRequestFooter'
import { TransactionLoadingState } from 'wallet/src/components/dappRequests/TransactionLoadingState'
import { TransactionPreviewCard } from 'wallet/src/components/dappRequests/TransactionPreviewCard'
import { useApprovalContractInfo } from 'wallet/src/features/dappRequests/hooks/useApprovalContractInfo'
import { useBlockaidTransactionScan } from 'wallet/src/features/dappRequests/hooks/useBlockaidTransactionScan'
import { useEarnAwareSections } from 'wallet/src/features/dappRequests/hooks/useEarnAwareSections'
import { usePublishScanGating } from 'wallet/src/features/dappRequests/hooks/usePublishScanGating'
import {
  DappVerificationStatus,
  TransactionErrorType,
  TransactionRiskLevel,
} from 'wallet/src/features/dappRequests/types'
import {
  determineTransactionErrorType,
  extractContractName,
  extractFunctionName,
  parseTransactionSections,
} from 'wallet/src/features/dappRequests/utils/blockaidUtils'
import { buildBlockaidScanTransactionRequest } from 'wallet/src/features/dappRequests/utils/buildBlockaidScanTransactionRequest'
import { deriveScanGating } from 'wallet/src/features/dappRequests/utils/scanGating'

interface DappTransactionScanningContentProps {
  transaction: EthTransaction
  chainId: UniverseChainId
  account: string
  dappUrl: string
  /** Blockaid site verification (merged with WC Verify on mobile), undefined while loading */
  siteVerificationStatus?: DappVerificationStatus
  confirmedRisk: boolean
  onConfirmRisk: (confirmed: boolean) => void
  onRiskLevelChange: (riskLevel: TransactionRiskLevel | null) => void
  /**
   * Reports whether the confirm button should get the destructive "critical" styling — true only for
   * a genuine malicious Blockaid verdict, never for a scan-failure caution (which borrows the
   * acknowledgement flow but is not a verdict).
   */
  onCriticalRiskChange?: (isCriticalRisk: boolean) => void
  errorType?: TransactionErrorType
  gasFee?: GasFeeResult
  requestMethod?: string
  showSmartWalletActivation?: boolean
  gasOverrides?: GasFeeOverrides
  onChangeGasOverrides?: (overrides: GasFeeOverrides | undefined) => void
}

/**
 * Shared component that handles Blockaid transaction scanning and displays results
 * Used by both Extension and Mobile for consistent transaction security scanning
 */
export function DappTransactionScanningContent({
  transaction,
  chainId,
  account,
  dappUrl,
  siteVerificationStatus,
  confirmedRisk,
  onConfirmRisk,
  onRiskLevelChange,
  onCriticalRiskChange,
  errorType: providedErrorType,
  gasFee,
  requestMethod,
  showSmartWalletActivation,
  gasOverrides,
  onChangeGasOverrides,
}: DappTransactionScanningContentProps): JSX.Element {
  const { to: toAddress, data } = transaction

  // Blockaid must scan the same concrete recipient ethers will use when populating the tx. Resolve
  // accepted address spellings (for example, a missing 0x prefix) to one checksummed value, and
  // refuse names or other values that could be resolved/reinterpreted later (finding #755).
  const hasRecipient = toAddress != null
  const normalizedToAddress = useMemo(
    () =>
      toAddress != null
        ? getValidAddress({ address: toAddress, platform: Platform.EVM, withEVMChecksum: true })
        : undefined,
    [toAddress],
  )
  const hasUnverifiedRecipient = hasRecipient && !normalizedToAddress
  const normalizedTransaction = useMemo(
    () => (normalizedToAddress ? { ...transaction, to: normalizedToAddress } : transaction),
    [normalizedToAddress, transaction],
  )

  // Build Blockaid scan request. A transaction that cannot be represented exactly for Blockaid is
  // malformed — track that so it can be hard-blocked, rather than falling through to the warn-and-allow
  // scan caution (which would leave a transaction we can't even encode for scanning confirmable).
  const { blockaidRequest, cannotRepresentTransaction } = useMemo<{
    blockaidRequest: BlockaidScanTransactionRequest | null
    cannotRepresentTransaction: boolean
  }>(() => {
    if (hasUnverifiedRecipient) {
      return { blockaidRequest: null, cannotRepresentTransaction: false }
    }
    try {
      return {
        blockaidRequest: buildBlockaidScanTransactionRequest({
          chainId,
          account,
          transaction: normalizedTransaction,
          dappUrl,
        }),
        cannotRepresentTransaction: false,
      }
    } catch (error) {
      logger.warn(
        'DappTransactionScanningContent',
        'buildBlockaidScanTransactionRequest',
        'Unable to build Blockaid transaction scan request, blocking confirmation',
        { error: error instanceof Error ? error.message : 'unknown' },
      )
      return { blockaidRequest: null, cannotRepresentTransaction: true }
    }
  }, [hasUnverifiedRecipient, chainId, account, normalizedTransaction, dappUrl])

  // Scan transaction with Blockaid
  const {
    scanResult,
    isLoading: isScanLoading,
    hasScanFailed,
    isScanFailurePermanent,
  } = useBlockaidTransactionScan(blockaidRequest)

  // Extract function name and contract name from simulation result
  const functionName = useMemo(() => extractFunctionName(scanResult), [scanResult])
  const contractName = useMemo(
    () => extractContractName(scanResult, normalizedToAddress ?? toAddress),
    [scanResult, normalizedToAddress, toAddress],
  )

  // Parse the Blockaid scan result into displayable sections
  const { sections, riskLevel } = useMemo(
    () => parseTransactionSections({ scanResult: scanResult ?? null, chainId, calls: [normalizedTransaction] }),
    [scanResult, chainId, normalizedTransaction],
  )

  // Collapse Earn deposit/withdraw into a dedicated Depositing/Withdrawing row when detected.
  // The calls let the detection verify the calldata — the simulation diff alone is spoofable.
  const earnCalls = useMemo(() => [normalizedTransaction], [normalizedTransaction])
  const earnAwareSections = useEarnAwareSections({ sections, chainId, account, calls: earnCalls })

  // Pinned spender "Contract" row + unverified-site alert for approvals
  const { approvalContract, showUnverifiedSiteWarning } = useApprovalContractInfo({
    sections: earnAwareSections,
    scanResult,
    riskLevel,
    chainId,
    siteVerificationStatus,
  })

  const fallbackErrorType = determineTransactionErrorType({
    sections: earnAwareSections,
    providedErrorType,
    rawData: data ?? '',
  })
  const gating = deriveScanGating({
    riskLevel,
    hasScanFailed,
    isScanFailurePermanent,
    isLoading: isScanLoading,
    localBlock:
      hasUnverifiedRecipient || cannotRepresentTransaction
        ? {
            errorType: hasUnverifiedRecipient
              ? TransactionErrorType.UnverifiedRecipient
              : TransactionErrorType.DecodeTransaction,
            previewRiskLevel: TransactionRiskLevel.Critical,
          }
        : undefined,
    fallbackErrorType,
    onConfirmRisk,
  })

  usePublishScanGating({ gating, onRiskLevelChange, onCriticalRiskChange, onConfirmRisk })

  // The Network cost editor (under FeatureFlags.GasFeeOverrides) needs a
  // `TransactionRequest` for the recommended-values fetch — `EthTransaction`
  // is already wire-compatible, just attach the chainId.
  const txRequest = useMemo(() => ({ ...transaction, chainId }), [transaction, chainId])

  if (isScanLoading) {
    return <TransactionLoadingState />
  }

  return (
    <Flex gap="$spacing12">
      {/* Transaction Preview Card */}
      <TransactionPreviewCard
        sections={earnAwareSections}
        riskLevel={gating.previewRiskLevel}
        errorType={gating.errorType}
        functionName={functionName}
        contractAddress={toAddress}
        contractName={contractName}
        rawData={data ?? ''}
        chainId={chainId}
        approvalContract={approvalContract}
      />

      <DappRequestFooter
        chainId={chainId}
        account={account}
        riskLevel={gating.footerRiskLevel}
        showUnverifiedSiteWarning={showUnverifiedSiteWarning}
        confirmedRisk={confirmedRisk}
        gasFee={gasFee}
        requestMethod={requestMethod}
        showSmartWalletActivation={showSmartWalletActivation}
        tx={txRequest}
        gasOverrides={gasOverrides}
        scanFailureError={gating.scanFailureError}
        onChangeGasOverrides={onChangeGasOverrides}
        onConfirmRisk={gating.onConfirmRisk}
      />
    </Flex>
  )
}
