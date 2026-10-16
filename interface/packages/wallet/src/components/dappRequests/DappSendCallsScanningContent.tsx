import { type TransactionRequest } from '@ethersproject/providers'
import { CHAIN_TO_ADDRESSES_MAP, NONFUNGIBLE_POSITION_MANAGER_ADDRESSES } from '@uniswap/sdk-core'
import type { BlockaidScanJsonRpcRequest, GasFeeResult, TradingApi } from '@universe/api'
import { type UniverseChainId, areAddressesEqual } from '@universe/chains'
import { numberToHex } from '@universe/encoding'
import { Flex } from '@universe/mycelium'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { GasFeeOverrides } from 'uniswap/src/features/gas/types'
import { DappRequestFooter } from 'wallet/src/components/dappRequests/DappRequestFooter'
import { TransactionLoadingState } from 'wallet/src/components/dappRequests/TransactionLoadingState'
import { TransactionPreviewCard } from 'wallet/src/components/dappRequests/TransactionPreviewCard'
import { safeNormalizeSendCalls } from 'wallet/src/features/batchedTransactions/normalizeSendCalls'
import { useApprovalContractInfo } from 'wallet/src/features/dappRequests/hooks/useApprovalContractInfo'
import { useBlockaidJsonRpcScan } from 'wallet/src/features/dappRequests/hooks/useBlockaidJsonRpcScan'
import { useEarnAwareSections } from 'wallet/src/features/dappRequests/hooks/useEarnAwareSections'
import { usePublishScanGating } from 'wallet/src/features/dappRequests/hooks/usePublishScanGating'
import type {
  DappVerificationStatus,
  SendCallsParams,
  TransactionAsset,
  TransactionSection,
} from 'wallet/src/features/dappRequests/types'
import {
  TransactionErrorType,
  TransactionRiskLevel,
  TransactionSectionType,
} from 'wallet/src/features/dappRequests/types'
import {
  determineTransactionErrorType,
  extractContractName,
  extractFunctionName,
  parseTransactionSections,
} from 'wallet/src/features/dappRequests/utils/blockaidUtils'
import { buildBlockaidScanJsonRpcRequest } from 'wallet/src/features/dappRequests/utils/buildBlockaidScanJsonRpcRequest'
import { deriveScanGating } from 'wallet/src/features/dappRequests/utils/scanGating'

const ERC721_ASSET_TYPES = new Set(['ERC721', 'ERC1155', 'NFT'])

// Blockaid's wallet_sendCalls scan API expects a wallet-controlled envelope version. Pin it rather than
// forwarding the dapp's `version`: a dapp could otherwise send an unsupported value to make the scan
// reject and (before the fail-closed classification) suppress detection.
const BLOCKAID_SEND_CALLS_SCAN_VERSION = '1.0'

export function isV3NonfungiblePositionManager(address: string | undefined, chainId: UniverseChainId): boolean {
  if (!address) {
    return false
  }
  const expected = NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId as number]
  return (
    !!expected &&
    areAddressesEqual({
      addressInput1: { address, chainId },
      addressInput2: { address: expected, chainId },
    })
  )
}

function isV4PositionManager(address: string | undefined, chainId: UniverseChainId): boolean {
  if (!address) {
    return false
  }
  // The `as keyof` cast asserts the chainId is a known key, which strips the
  // possibility of `undefined` from the lookup — restore it since not every
  // UniverseChainId is present in CHAIN_TO_ADDRESSES_MAP at runtime.
  const chainAddresses = CHAIN_TO_ADDRESSES_MAP[chainId as unknown as keyof typeof CHAIN_TO_ADDRESSES_MAP] as
    | (typeof CHAIN_TO_ADDRESSES_MAP)[keyof typeof CHAIN_TO_ADDRESSES_MAP]
    | undefined
  const expected = chainAddresses?.v4PositionManagerAddress
  return (
    !!expected &&
    areAddressesEqual({
      addressInput1: { address, chainId },
      addressInput2: { address: expected, chainId },
    })
  )
}

/**
 * Find the first V3 position NFT in a Sending section that doesn't already
 * have a matching Approving entry. Scoped to known V3 NonfungiblePositionManager
 * addresses so non-V3 NFTs are not mislabeled.
 */
function findUnapprovedV3NftSending(
  sections: TransactionSection[],
  chainId: UniverseChainId,
): TransactionAsset | undefined {
  const approvedAddresses = new Set(
    sections.filter((s) => s.type === TransactionSectionType.Approving).flatMap((s) => s.assets.map((a) => a.address)),
  )
  for (const section of sections) {
    if (section.type !== TransactionSectionType.Sending) {
      continue
    }
    const nft = section.assets.find(
      (a) =>
        ERC721_ASSET_TYPES.has(a.type) &&
        !approvedAddresses.has(a.address) &&
        isV3NonfungiblePositionManager(a.address, chainId),
    )
    if (nft) {
      return nft
    }
  }
  return undefined
}

interface DappSendCallsScanningContentProps {
  // Only the canonical `calls` are consumed here. The dapp-controlled envelope fields (`version`, `id`,
  // `capabilities`) are deliberately excluded: they can carry secrets or unsupported values, and the scan
  // request pins its own version instead (see the scan-request build below).
  request: Pick<SendCallsParams, 'calls'>
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
  /**
   * The encoded batched transaction request (7702 path) — needed by the
   * Network cost editor to fetch the recommended baseline. Optional because
   * 4337 sponsored-userOp flows have no concrete tx to estimate against.
   */
  tx?: TransactionRequest
  sponsorMetadata?: TradingApi.SponsorMetadata
}

/**
 * Shared component that handles Blockaid scanning for wallet_sendCalls requests
 * Scans the entire batch of calls and displays simulation results with risk analysis
 */
export function DappSendCallsScanningContent({
  request,
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
  tx,
  sponsorMetadata,
}: DappSendCallsScanningContentProps): JSX.Element {
  const { t } = useTranslation()
  const { calls } = request

  // Strip Extension-only display metadata and apply the same lossless normalization used by the
  // 4337/7702 execution paths. An unsupported call rejects the whole batch. Both intake paths
  // already reject those, so this drives the blocked-preview UI rather than crashing the screen if
  // one ever reaches here (a persisted pre-upgrade request, or a future entry point).
  const normalizeResult = useMemo(() => safeNormalizeSendCalls(calls), [calls])
  const normalizedCalls = normalizeResult.ok ? normalizeResult.calls : undefined

  // Extract representative data from the first canonical call for display purposes.
  const firstCall = normalizedCalls?.[0]
  const toAddress = firstCall?.to
  const rawData = firstCall?.data

  // Build the Blockaid scan request from the canonical calls only. The envelope version is pinned to a
  // wallet-controlled, scanner-supported constant (not the dapp's), and the dapp-controlled `id` and
  // `capabilities` are omitted entirely: none is needed to inspect the batch's effect on the account
  // (that is fully described by `calls`), and forwarding them would let a dapp leak secrets (a
  // paymasterService credential URL / encrypted sponsorship context) or feed the scanner unsupported
  // metadata to suppress the scan.
  const blockaidRequest = useMemo<BlockaidScanJsonRpcRequest | null>(() => {
    if (!normalizedCalls) {
      return null
    }
    return buildBlockaidScanJsonRpcRequest({
      chainId,
      account,
      method: 'wallet_sendCalls',
      params: [
        {
          version: BLOCKAID_SEND_CALLS_SCAN_VERSION,
          chainId: numberToHex(chainId),
          from: account,
          calls: normalizedCalls,
        },
      ],
      dappUrl,
    })
  }, [chainId, account, normalizedCalls, dappUrl])

  // Scan calls with Blockaid
  const {
    scanResult,
    isLoading: isScanLoading,
    hasScanFailed,
    isScanFailurePermanent,
  } = useBlockaidJsonRpcScan(blockaidRequest)

  // Extract function name and contract name from simulation result
  const functionName = useMemo(() => extractFunctionName(scanResult), [scanResult])
  const contractName = useMemo(() => extractContractName(scanResult, toAddress), [scanResult, toAddress])

  // Parse the Blockaid scan result into displayable sections
  const { sections, riskLevel } = useMemo(
    () => parseTransactionSections({ scanResult: scanResult ?? null, chainId, calls: normalizedCalls }),
    [scanResult, chainId, normalizedCalls],
  )

  // Rename V3/V4 position NFTs to friendly labels across all sections,
  // and inject an Approving section for V3 NFTs approved off-chain.
  const mergedSections = useMemo(() => {
    const renamePositionNfts = (s: TransactionSection): TransactionSection => ({
      ...s,
      assets: s.assets.map((a) => {
        if (!ERC721_ASSET_TYPES.has(a.type)) {
          return a
        }
        if (isV3NonfungiblePositionManager(a.address, chainId)) {
          return { ...a, name: t('position.v3.nft') }
        }
        if (isV4PositionManager(a.address, chainId)) {
          return { ...a, name: t('position.v4.nft') }
        }
        return a
      }),
    })

    const renamed = sections.map(renamePositionNfts)

    const nft = findUnapprovedV3NftSending(sections, chainId)
    if (!nft) {
      return renamed
    }
    return [
      {
        type: TransactionSectionType.Approving,
        assets: [
          {
            type: nft.type,
            address: nft.address,
            chainId,
            name: t('position.v3.nft'),
            logoUrl: nft.logoUrl,
          },
        ],
      },
      ...renamed,
    ]
  }, [sections, chainId, t])

  // Collapse Earn deposit/withdraw into a dedicated Depositing/Withdrawing row when detected.
  // The calls let the detection verify the calldata — the simulation diff alone is spoofable.
  const earnAwareSections = useEarnAwareSections({
    sections: mergedSections,
    chainId,
    account,
    calls: normalizedCalls,
  })

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
    rawData: rawData ?? '',
  })
  const gating = deriveScanGating({
    riskLevel,
    hasScanFailed,
    isScanFailurePermanent,
    isLoading: isScanLoading,
    // A batch we can't normalize can neither be encoded for execution nor scanned, and no retry of the
    // same batch changes that. Hard-block it (no acknowledgement path) rather than surfacing a confirmable
    // caution — the same treatment the transaction surface gives an un-representable request — so Confirm
    // can never be enabled for a batch that would sign an empty/undefined payload.
    localBlock: normalizeResult.ok
      ? undefined
      : { errorType: TransactionErrorType.DecodeTransaction, previewRiskLevel: TransactionRiskLevel.Critical },
    fallbackErrorType,
    onConfirmRisk,
  })

  usePublishScanGating({ gating, onRiskLevelChange, onCriticalRiskChange, onConfirmRisk })

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
        rawData={rawData ?? ''}
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
        tx={tx}
        gasOverrides={gasOverrides}
        sponsorMetadata={sponsorMetadata}
        scanFailureError={gating.scanFailureError}
        onChangeGasOverrides={onChangeGasOverrides}
        onConfirmRisk={gating.onConfirmRisk}
      />
    </Flex>
  )
}
