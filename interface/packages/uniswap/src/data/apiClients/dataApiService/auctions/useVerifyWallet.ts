import { PartialMessage } from '@bufbuild/protobuf'
import { UseQueryResult, useQuery } from '@tanstack/react-query'
import {
  VerifyWalletRequest,
  VerifyWalletResponse,
} from '@uniswap/client-liquidity/dist/uniswap/liquidity/v1/auction_pb'
import {
  AuctionValidation,
  ChainId,
  Erc1155GateData,
  KycVerificationStatus,
  MaxBidPriceData,
  PredicateKycVerificationData,
  ValidationType,
} from '@uniswap/client-liquidity/dist/uniswap/liquidity/v1/types_pb'
import { useEffect } from 'react'
import { PollingInterval, ZERO_ADDRESS } from 'uniswap/src/constants/misc'
import { AUCTION_DEFAULT_RETRY, AuctionStaleTime } from 'uniswap/src/data/apiClients/dataApiService/auctions/queryTypes'
import { AuctionQueryClient } from 'uniswap/src/data/apiClients/liquidityService/AuctionQueryClient'
import { logger } from 'utilities/src/logger/logger'
import { ReactQueryCacheKey } from 'utilities/src/reactQuery/cache'

/**
 * The VerifyWallet request params, built in one place.
 *
 * The ENTIRE params object is the react-query key, so two call sites share a cache entry
 * only if their params match field for field. Both the KYC status hook and the max-bid-price
 * hook subscribe per auction page; if either added or renamed a field independently they
 * would silently issue a second VerifyWallet request per page view. Going through this
 * builder makes that coupling enforced rather than documented.
 */
export function buildVerifyWalletParams({
  walletAddress,
  auctionAddress,
  chainId,
}: {
  walletAddress?: string
  auctionAddress?: string
  chainId?: number
}): PartialMessage<VerifyWalletRequest> {
  return {
    // The ceiling and the auction's gating requirements are properties of the auction, not
    // of the visitor, so the query still runs (and shares its key) when nobody is connected.
    walletAddress: walletAddress ?? ZERO_ADDRESS,
    auctionAddress,
    chainId: chainId as unknown as ChainId,
  }
}

/**
 * Hook to verify a wallet's KYC status for an auction.
 *
 * Automatically polls when status is PENDING (every 15 seconds).
 * Disabled when walletAddress, auctionAddress, or chainId is not provided.
 *
 * @example
 * ```tsx
 * const { data, isLoading, isError } = useVerifyWalletQuery({
 *   walletAddress: account?.address,
 *   auctionAddress: auction?.contractAddress,
 *   chainId: auction?.chainId,
 * })
 *
 * if (data?.status === VerificationStatus.COMPLETED) {
 *   // User can bid
 * }
 * ```
 */
export function useVerifyWalletQuery(
  params: PartialMessage<VerifyWalletRequest>,
  currentBlockNumber?: number,
): UseQueryResult<VerifyWalletResponse, Error> {
  const enabled = Boolean(params.walletAddress && params.auctionAddress && params.chainId)

  const verifyWalletQuery = useQuery({
    queryKey: [ReactQueryCacheKey.LiquidityService, 'verifyWallet', params],
    queryFn: () => {
      return AuctionQueryClient.verifyWallet({
        ...params,
      })
    },
    enabled,
    staleTime: AuctionStaleTime.FAST,
    retry: AUCTION_DEFAULT_RETRY,
    refetchInterval: (query) => {
      const kycValidation = query.state.data?.validations.find(isKycValidation)
      const status = kycValidation?.data.value?.status
      if (status === KycVerificationStatus.VERIFICATION_STATUS_PENDING) {
        return PollingInterval.Fast
      }
      return false
    },
  })

  const presaleValidation = verifyWalletQuery.data?.validations.find(isAllowlistedValidation)
  const expirationBlock = presaleValidation?.data.value?.expirationBlock
  const presaleGateExpired =
    expirationBlock !== undefined && currentBlockNumber !== undefined && currentBlockNumber > Number(expirationBlock)

  const { refetch } = verifyWalletQuery
  useEffect(() => {
    if (enabled && presaleGateExpired) {
      void refetch()
    }
  }, [enabled, presaleGateExpired, refetch])

  return verifyWalletQuery
}

export function isKycValidation(v: AuctionValidation): v is AuctionValidation & {
  data: { value: PredicateKycVerificationData | undefined }
} {
  return v.validationType === ValidationType.KYC_VERIFICATION
}

export function isAllowlistedValidation(v: AuctionValidation): v is AuctionValidation & {
  data: { value: Erc1155GateData | undefined }
} {
  return v.validationType === ValidationType.ERC_1155_GATEWAY
}

/** A validation that gates the WALLET, as opposed to the bid amount. */
function isDeclaredWalletGatingType(v: AuctionValidation): boolean {
  return v.validationType === ValidationType.KYC_VERIFICATION || v.validationType === ValidationType.ERC_1155_GATEWAY
}

/**
 * Whether a validation carries the auction's bid price ceiling.
 *
 * The invariant: the oneof case alone decides, and a declared wallet-gating type is never
 * the ceiling whatever payload it carries. Never match on the enum ordinal — that would let
 * a malformed response reclassify a wallet gate as the ceiling and drop it from the set
 * that gates bidding.
 */
export function isMaxBidPriceValidation(
  v: AuctionValidation,
): v is AuctionValidation & { data: { case: 'maxBidPriceData'; value: MaxBidPriceData } } {
  return !isDeclaredWalletGatingType(v) && v.data.case === 'maxBidPriceData'
}

/**
 * The auction-wide bid price ceiling, as a Q96 decimal string, or undefined when the
 * auction's validation hook imposes none.
 *
 * Independent of KYC and of the allowlist: a hook can impose a ceiling on its own or
 * alongside either of them, and the ceiling applies to every wallet regardless of its
 * own verification status, so this never consults `validationPassed`.
 *
 * Matched by {@link isMaxBidPriceValidation} on the oneof case name alone — see the
 * reasoning there for why no enum-ordinal fallback is involved.
 *
 * Returns a bigint rather than the wire string so the parse cannot be deferred to callers:
 * the whole point is that an unparseable value never reaches a `BigInt()` at render time.
 * Anything that is not a positive integer string within uint256's width yields undefined.
 */
export function getMaxBidPriceQ96(validations: AuctionValidation[] | undefined): bigint | undefined {
  const validation = validations?.find(isMaxBidPriceValidation)
  const raw: unknown = validation?.data.value.maxBidPriceQ96
  // 78 digits is uint256's decimal width, so this bounds MAGNITUDE as well as character
  // set: the ceiling is a uint256 on chain, and anything wider cannot be one. Without the
  // cap an arbitrarily long digit string still reaches BigInt, the tick math, and the
  // banner copy — a main-thread stall from the same contract break the warn below reports.
  if (typeof raw !== 'string' || !/^\d{1,78}$/.test(raw)) {
    // `''` is excluded deliberately: proto3 gives a string field an empty-string default,
    // so an unset max_bid_price_q96 decodes to '' and is indistinguishable from absent.
    // Warning on it would report a contract break for a message that simply omitted the
    // field, which is the noisiest possible false positive — it fires per response.
    if (typeof raw === 'string' && raw !== '') {
      // A value that is present but unparseable IS a backend contract break, and it
      // silently disables every ceiling behavior at once — bidders would start hitting
      // on-chain MaxBidPriceExceeded reverts with nothing pointing at the cause.
      logger.warn('useVerifyWallet', 'getMaxBidPriceQ96', 'Unparseable maxBidPriceQ96; ignoring ceiling', {
        rawLength: raw.length,
      })
    }
    return undefined
  }
  const parsed = BigInt(raw)
  // A zero ceiling is no ceiling: no price can be both strictly above the clearing price
  // and at or below zero, so honoring it would render a live auction as closed.
  return parsed === 0n ? undefined : parsed
}

/**
 * Legacy response shape for backwards compatibility with useAuctionKycStatus
 */
export interface LegacyVerifyWalletResponse {
  status: KycVerificationStatus
  redirectUrl?: string
  isAllowlisted: boolean
  hasPresale: boolean
  hasKycVerification: boolean
  canBid: boolean
  allowlistEndBlock?: number
}

/**
 * Transforms the new AuctionValidation[] response to the legacy flat structure
 * used by useAuctionKycStatus for backwards compatibility.
 */
export function toLegacyVerifyWalletResponse(validations: AuctionValidation[]): LegacyVerifyWalletResponse {
  const kycValidation = validations.find(isKycValidation)
  const presaleValidation = validations.find(isAllowlistedValidation)

  const kycData = kycValidation?.data.value
  const hasKycVerification = !!kycValidation
  const hasPresale = !!presaleValidation

  const expirationBlock = presaleValidation?.data.value?.expirationBlock
  const allowlistEndBlock = expirationBlock !== undefined ? Number(expirationBlock) : undefined

  // All WALLET-GATING validations must pass to bid. The ceiling is excluded because it
  // gates the bid amount, not the wallet: folding it in would let a `validationPassed:
  // false` on that entry block wallets that are entitled to bid, and on an auction with no
  // KYC validation would be silently ignored instead. Its consumer is getMaxBidPriceQ96.
  const walletGatingValidations = validations.filter((v) => !isMaxBidPriceValidation(v))
  const canBid = walletGatingValidations.length > 0 && walletGatingValidations.every((v) => v.validationPassed)

  let status = kycData?.status
  if (status === KycVerificationStatus.VERIFICATION_STATUS_UNSPECIFIED) {
    status = KycVerificationStatus.VERIFICATION_STATUS_NOT_STARTED
  }

  return {
    status: status ?? KycVerificationStatus.VERIFICATION_STATUS_UNSPECIFIED,
    redirectUrl: kycData?.redirectUrl,
    isAllowlisted: presaleValidation?.validationPassed ?? false,
    hasPresale,
    hasKycVerification,
    canBid,
    allowlistEndBlock,
  }
}
