import { type BlockaidScanTransactionResponse } from '@universe/api'
import { UniverseChainId, AddressStringFormat, normalizeAddress } from '@universe/chains'
import {
  type DappRequestCall,
  type ParsedTransactionData,
  type TransactionAsset,
  TransactionErrorType,
  TransactionRiskLevel,
  type TransactionSection,
  TransactionSectionType,
} from 'wallet/src/features/dappRequests/types'
import { parseApprovals } from 'wallet/src/features/dappRequests/utils/blockaidApprovalUtils'
import { getAssetAddress, roundToDecimals } from 'wallet/src/features/dappRequests/utils/blockaidAssetUtils'

interface DetermineTransactionErrorTypeParams {
  sections: TransactionSection[]
  providedErrorType: TransactionErrorType | undefined
  rawData: string | undefined
}

/**
 * Determines the appropriate error type to display for a transaction request.
 *
 * When a transaction request cannot be fully parsed or understood, we need to show
 * an appropriate error/warning state to the user. This function implements the fallback
 * logic that shows "Contract interaction" when specific conditions are met.
 *
 * The "Contract interaction" fallback is shown when:
 * 1. No asset transfer sections were detected from the Blockaid scan (sections.length === 0)
 *    - This means we couldn't parse any token transfers, approvals, or other known patterns
 * 2. No explicit error type was provided by the caller (providedErrorType is undefined)
 *    - The caller hasn't already identified a specific error condition
 * 3. The transaction contains calldata (rawData is truthy)
 *    - This indicates a contract call, not a simple ETH transfer
 *
 * @param params - Object containing sections, providedErrorType, and rawData
 * @param params.sections - Parsed transaction sections from Blockaid scan (transfers, approvals, etc.)
 * @param params.providedErrorType - Explicitly provided error type from the caller (if any)
 * @param params.rawData - The transaction's calldata (hex string). If present, indicates a contract call.
 *
 * @returns The error type to display, or undefined if no error state should be shown
 */
export function determineTransactionErrorType({
  sections,
  providedErrorType,
  rawData,
}: DetermineTransactionErrorTypeParams): TransactionErrorType | undefined {
  const showContractInteractionFallback = sections.length === 0 && !providedErrorType && rawData
  return showContractInteractionFallback ? TransactionErrorType.ContractInteraction : providedErrorType
}

/**
 * Determines the risk level from Blockaid validation classification
 */
export function getRiskLevelFromClassification(classification?: string): TransactionRiskLevel {
  if (!classification) {
    return TransactionRiskLevel.None
  }

  const lowerClassification = classification.toLowerCase()

  // Malicious and critical classifications
  if (lowerClassification.includes('malicious') || lowerClassification.includes('attack')) {
    return TransactionRiskLevel.Critical
  }

  // Warning classifications
  if (lowerClassification.includes('warning') || lowerClassification.includes('suspicious')) {
    return TransactionRiskLevel.Warning
  }

  return TransactionRiskLevel.None
}

// Rank levels numerically so multiple Blockaid signals can be combined by taking the highest.
const RISK_SEVERITY: Record<TransactionRiskLevel, number> = {
  [TransactionRiskLevel.None]: 0,
  [TransactionRiskLevel.Warning]: 1,
  [TransactionRiskLevel.Critical]: 2,
}

function maxRiskLevel(levels: TransactionRiskLevel[]): TransactionRiskLevel {
  return levels.reduce(
    (highest, level) => (RISK_SEVERITY[level] > RISK_SEVERITY[highest] ? level : highest),
    TransactionRiskLevel.None,
  )
}

// `result_type` is Blockaid's authoritative verdict, matched case-insensitively. Benign/Spam/unknown -> None.
export function getRiskLevelFromResultType(resultType?: string): TransactionRiskLevel {
  switch (resultType?.toLowerCase()) {
    case 'malicious':
      return TransactionRiskLevel.Critical
    case 'warning':
      return TransactionRiskLevel.Warning
    default:
      return TransactionRiskLevel.None
  }
}

// Defense-in-depth: a Malicious feature (e.g. HIGH_RISK_SPENDER) -> Critical, a Warning feature -> Warning.
// `type` is a validated enum (unlike result_type), so exact match is intentional — a casing drift fails Zod upstream.
function getRiskLevelFromFeatures(features?: { type: string }[]): TransactionRiskLevel {
  if (!features?.length) {
    return TransactionRiskLevel.None
  }
  if (features.some((feature) => feature.type === 'Malicious')) {
    return TransactionRiskLevel.Critical
  }
  if (features.some((feature) => feature.type === 'Warning')) {
    return TransactionRiskLevel.Warning
  }
  return TransactionRiskLevel.None
}

/**
 * Risk level from a Blockaid validation result: the highest severity across `result_type`
 * (authoritative verdict), `features[].type` (defense-in-depth), and a `classification` substring match.
 */
export function getRiskLevelFromValidation(
  validation?: BlockaidScanTransactionResponse['validation'],
): TransactionRiskLevel {
  if (!validation) {
    return TransactionRiskLevel.None
  }
  return maxRiskLevel([
    getRiskLevelFromResultType(validation.result_type),
    getRiskLevelFromFeatures(validation.features),
    getRiskLevelFromClassification(validation.classification),
  ])
}

/**
 * Type alias for asset diffs array from successful simulation
 */
type AssetDiffs = NonNullable<
  Extract<BlockaidScanTransactionResponse['simulation'], { status: 'Success' }>['account_summary']
>['assets_diffs']

/**
 * Parses sending assets from Blockaid asset diffs
 */
export function parseSendingAssets(assetsDiffs: AssetDiffs, chainId: UniverseChainId): TransactionSection | null {
  const sendingAssets: TransactionAsset[] = []

  assetsDiffs.forEach((assetDiff: (typeof assetsDiffs)[number]) => {
    if (assetDiff.out.length > 0) {
      const outAmount = assetDiff.out[0]
      if (!outAmount) {
        return
      }
      const asset = assetDiff.asset

      sendingAssets.push({
        type: asset.type,
        symbol: asset.symbol,
        name: asset.type === 'ERC20' ? asset.name || asset.symbol : asset.name,
        amount: outAmount.value !== undefined ? roundToDecimals(outAmount.value) : undefined,
        usdValue: outAmount.usd_price ? String(outAmount.usd_price) : undefined,
        logoUrl: asset.logo_url,
        address: getAssetAddress(asset),
        chainId,
      })
    }
  })

  if (sendingAssets.length === 0) {
    return null
  }

  return {
    type: TransactionSectionType.Sending,
    assets: sendingAssets,
  }
}

/**
 * Parses receiving assets from Blockaid asset diffs
 */
export function parseReceivingAssets(assetsDiffs: AssetDiffs, chainId: UniverseChainId): TransactionSection | null {
  const receivingAssets: TransactionAsset[] = []

  assetsDiffs.forEach((assetDiff: (typeof assetsDiffs)[number]) => {
    if (assetDiff.in.length > 0) {
      const inAmount = assetDiff.in[0]
      if (!inAmount) {
        return
      }
      const asset = assetDiff.asset

      receivingAssets.push({
        type: asset.type,
        symbol: asset.symbol,
        name: asset.type === 'ERC20' ? asset.name || asset.symbol : asset.name,
        amount: inAmount.value !== undefined ? roundToDecimals(inAmount.value) : undefined,
        usdValue: inAmount.usd_price ? String(inAmount.usd_price) : undefined,
        logoUrl: asset.logo_url,
        address: getAssetAddress(asset),
        chainId,
      })
    }
  })

  if (receivingAssets.length === 0) {
    return null
  }

  return {
    type: TransactionSectionType.Receiving,
    assets: receivingAssets,
  }
}

interface ParseTransactionSectionsParams {
  scanResult: BlockaidScanTransactionResponse | null
  chainId: UniverseChainId
  calls?: readonly DappRequestCall[]
}

/**
 * Parses Blockaid scan result into transaction sections for UI display
 */
export function parseTransactionSections({
  scanResult,
  chainId,
  calls = [],
}: ParseTransactionSectionsParams): ParsedTransactionData {
  // Derive risk from validation signals; works even without a simulation (signature requests).
  const riskLevel = getRiskLevelFromValidation(scanResult?.validation)

  if (!scanResult?.simulation || scanResult.simulation.status !== 'Success') {
    return {
      sections: [],
      riskLevel, // Use validation-based risk level
    }
  }

  const { assets_diffs, exposures } = scanResult.simulation.account_summary

  return {
    sections: [
      parseSendingAssets(assets_diffs, chainId),
      parseReceivingAssets(assets_diffs, chainId),
      parseApprovals({ exposures, chainId, calls }),
    ].filter((section): section is TransactionSection => section !== null),
    riskLevel,
  }
}

/**
 * Extracts the function name from a Blockaid scan result's function signature
 * @param scanResult - The Blockaid scan transaction response
 * @returns The function name (e.g., "approve" from "approve(address,address,uint160,uint48)"), or undefined if not available
 */
export function extractFunctionName(scanResult?: BlockaidScanTransactionResponse | null): string | undefined {
  if (scanResult?.simulation?.status !== 'Success') {
    return undefined
  }

  // Parse function signature to extract function name
  // Example: "approve(address,address,uint160,uint48)" -> "approve"
  const params = scanResult.simulation.params
  const functionSignature = params?.calldata?.function_signature

  if (typeof functionSignature === 'string') {
    const match = functionSignature.match(/^([^(]+)/)
    return match?.[1]
  }

  return undefined
}

/**
 * Extracts the contract name for a given address from Blockaid scan result
 * Uses case-insensitive address matching since Ethereum addresses can be checksummed
 * @param scanResult - The Blockaid scan transaction response
 * @param address - The contract address to look up
 * @returns The contract name if found, or undefined
 */
export function extractContractName(
  scanResult: BlockaidScanTransactionResponse | null | undefined,
  address: string | undefined,
): string | undefined {
  if (!address || scanResult?.simulation?.status !== 'Success') {
    return undefined
  }

  const addressDetails = scanResult.simulation.address_details

  // Normalize the address to lowercase for case-insensitive lookup
  const normalizedAddress = normalizeAddress(address, AddressStringFormat.Lowercase)
  const matchingKey = Object.keys(addressDetails).find(
    (key) => normalizeAddress(key, AddressStringFormat.Lowercase) === normalizedAddress,
  )

  return matchingKey ? addressDetails[matchingKey]?.contract_name : undefined
}
