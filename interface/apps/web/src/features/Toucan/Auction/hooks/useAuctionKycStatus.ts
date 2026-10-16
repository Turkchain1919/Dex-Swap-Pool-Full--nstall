import { KycVerificationStatus } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v1/types_pb'
import { UniverseChainId } from '@universe/chains'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  buildVerifyWalletParams,
  toLegacyVerifyWalletResponse,
  useVerifyWalletQuery,
} from 'uniswap/src/data/apiClients/dataApiService/auctions/useVerifyWallet'

interface UseAuctionKycStatusParams {
  /**
   * Connected wallet address. When omitted/undefined the hook falls back to the
   * zero address so the verify-wallet query still runs and the auction's
   * KYC/allowlist requirements resolve for logged-out users. Pass the connected
   * address to additionally resolve that wallet's own verification status.
   */
  walletAddress?: string
  auctionAddress?: string
  chainId?: UniverseChainId
  currentBlockNumber?: number
}

export interface AuctionKycStatus {
  /** Whether user is allowed to proceed to bid review */
  canBid: boolean
  /** Override button label for KYC states (undefined = use default) */
  kycButtonLabel?: string
  /** Label shown when user is not whitelisted for presale (undefined = no label) */
  whitelistLabel?: string
  /** Whether button should be disabled due to KYC */
  kycButtonDisabled: boolean
  /** Action to take when button is clicked in non-bidable KYC state */
  onKycAction: (() => void) | undefined
  /** Whether KYC data is still loading */
  isLoading: boolean
  /** Whether there was an error fetching KYC status */
  isError: boolean
  /** Whether user is on the allowlist */
  isAllowlisted: boolean
  /** Whether auction has presale requiring whitelist */
  auctionHasPresale: boolean
  /** Whether auction needs verification */
  auctionNeedsVerification: boolean
  /** The current status of the KYC verification */
  status: KycVerificationStatus
  /** Block at which the allowlist-only restriction lifts and general sale opens */
  allowlistEndBlock?: number
  /**
   * The lookup succeeded and returned NO validations at all — the backend recognized
   * nothing about this auction's validation hook. Distinct from isError (the lookup
   * failed) and from a normal hookless auction, which callers separate by checking the
   * hook address. **False, not undefined, while the query is in flight**, so a pending
   * request never reads as an unmodeled hook.
   */
  hasNoRecognizedValidations: boolean
}

export function useAuctionKycStatus({
  walletAddress,
  auctionAddress,
  chainId,
  currentBlockNumber,
}: UseAuctionKycStatusParams): AuctionKycStatus {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useVerifyWalletQuery(
    buildVerifyWalletParams({ walletAddress, auctionAddress, chainId }),
    currentBlockNumber,
  )

  // Settled successfully with an empty array: everything the backend knows about this
  // auction's hook is "nothing". `data` alone is the right guard — the query result is a
  // discriminated union, so its presence already means the request succeeded, and a
  // loading or errored state can never reach here. (Explicit !isLoading/!isError checks
  // were provably dead and tripped no-unnecessary-condition.)
  const hasNoRecognizedValidations = Boolean(data && data.validations.length === 0)

  const legacyData = useMemo(() => {
    if (data?.validations) {
      return toLegacyVerifyWalletResponse(data.validations)
    }
    return undefined
  }, [data?.validations])

  const redirectToKyc = useCallback(() => {
    if (legacyData?.redirectUrl) {
      window.open(legacyData.redirectUrl, '_blank')
    }
  }, [legacyData?.redirectUrl])

  return useMemo(() => {
    // Still loading
    if (isLoading) {
      return {
        canBid: false,
        whitelistLabel: undefined,
        kycButtonDisabled: true,
        onKycAction: undefined,
        isLoading: true,
        isError: false,
        isAllowlisted: false,
        auctionHasPresale: false,
        auctionNeedsVerification: false,
        status: KycVerificationStatus.VERIFICATION_STATUS_UNSPECIFIED,
        hasNoRecognizedValidations,
      }
    }

    // Error fetching
    if (isError || !legacyData) {
      return {
        canBid: false,
        whitelistLabel: undefined,
        kycButtonDisabled: true,
        onKycAction: undefined,
        isLoading: false,
        isError: true,
        isAllowlisted: false,
        auctionHasPresale: false,
        auctionNeedsVerification: false,
        status: KycVerificationStatus.VERIFICATION_STATUS_UNSPECIFIED,
        hasNoRecognizedValidations,
      }
    }

    const {
      isAllowlisted,
      hasPresale: auctionHasPresale,
      hasKycVerification: auctionNeedsVerification,
      allowlistEndBlock,
    } = legacyData

    // Compute whitelistLabel once - shown when presale is active but user is not whitelisted
    const whitelistLabel = auctionHasPresale && !isAllowlisted ? t('toucan.kyc.generalSaleStartsSoon') : undefined

    // No verification needed for this auction
    if (!auctionNeedsVerification) {
      return {
        canBid: true,
        whitelistLabel,
        kycButtonDisabled: false,
        onKycAction: undefined,
        isLoading: false,
        isError: false,
        isAllowlisted,
        auctionHasPresale,
        auctionNeedsVerification,
        status: legacyData.status,
        allowlistEndBlock,
        hasNoRecognizedValidations,
      }
    }

    // Use the pre-computed canBid from the polyfill (all validations passed)
    if (legacyData.canBid) {
      return {
        canBid: true,
        whitelistLabel,
        kycButtonDisabled: false,
        onKycAction: undefined,
        isLoading: false,
        isError: false,
        isAllowlisted,
        auctionHasPresale,
        auctionNeedsVerification,
        status: legacyData.status,
        allowlistEndBlock,
        hasNoRecognizedValidations,
      }
    }

    // KYC pending
    if (legacyData.status === KycVerificationStatus.VERIFICATION_STATUS_PENDING) {
      return {
        canBid: false,
        kycButtonLabel: t('toucan.kyc.verificationInProgress'),
        whitelistLabel,
        kycButtonDisabled: false,
        onKycAction: redirectToKyc,
        isLoading: false,
        isError: false,
        isAllowlisted,
        auctionHasPresale,
        auctionNeedsVerification,
        status: legacyData.status,
        allowlistEndBlock,
        hasNoRecognizedValidations,
      }
    }

    // KYC needs retry
    if (legacyData.status === KycVerificationStatus.VERIFICATION_STATUS_RETRY) {
      return {
        canBid: false,
        kycButtonLabel: t('toucan.kyc.verificationRetry'),
        whitelistLabel,
        kycButtonDisabled: false,
        onKycAction: redirectToKyc,
        isLoading: false,
        isError: false,
        isAllowlisted,
        auctionHasPresale,
        auctionNeedsVerification,
        status: legacyData.status,
        allowlistEndBlock,
        hasNoRecognizedValidations,
      }
    }

    // Verification failed
    if (legacyData.status === KycVerificationStatus.VERIFICATION_STATUS_REJECTED) {
      return {
        canBid: false,
        kycButtonLabel: t('toucan.kyc.verificationFailed'),
        whitelistLabel,
        kycButtonDisabled: false,
        onKycAction: undefined,
        isLoading: false,
        isError: false,
        isAllowlisted,
        auctionHasPresale,
        auctionNeedsVerification,
        status: legacyData.status,
        allowlistEndBlock,
        hasNoRecognizedValidations,
      }
    }

    if (legacyData.status === KycVerificationStatus.VERIFICATION_STATUS_NOT_STARTED) {
      return {
        canBid: false,
        kycButtonLabel: t('toucan.kyc.verifyIdentity'),
        whitelistLabel,
        kycButtonDisabled: false,
        onKycAction: redirectToKyc,
        isLoading: false,
        isError: false,
        isAllowlisted,
        auctionHasPresale,
        auctionNeedsVerification,
        status: legacyData.status,
        allowlistEndBlock,
        hasNoRecognizedValidations,
      }
    }

    // Not allowlisted
    if (auctionHasPresale && !isAllowlisted) {
      return {
        canBid: false,
        whitelistLabel,
        kycButtonDisabled: true,
        onKycAction: undefined,
        isLoading: false,
        isError: false,
        isAllowlisted,
        auctionHasPresale,
        auctionNeedsVerification,
        status: legacyData.status,
        allowlistEndBlock,
        hasNoRecognizedValidations,
      }
    }

    // Default to bid
    return {
      canBid: true,
      whitelistLabel,
      kycButtonDisabled: false,
      onKycAction: undefined,
      isLoading: false,
      isError: false,
      isAllowlisted: true,
      auctionHasPresale: false,
      auctionNeedsVerification: false,
      status: KycVerificationStatus.VERIFICATION_STATUS_COMPLETED,
      allowlistEndBlock,
      hasNoRecognizedValidations,
    }
  }, [legacyData, isLoading, isError, t, redirectToKyc, hasNoRecognizedValidations])
}
