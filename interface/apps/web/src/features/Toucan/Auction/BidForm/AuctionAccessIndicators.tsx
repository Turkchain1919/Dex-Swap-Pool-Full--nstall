import { KycVerificationStatus } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v1/types_pb'
import { UniverseChainId } from '@universe/chains'
import { Flex, Text, TouchableArea } from '@universe/mycelium'
import { EnvelopeCheck } from '@universe/mycelium/icons/EnvelopeCheck'
import { EnvelopeLock } from '@universe/mycelium/icons/EnvelopeLock'
import { QuestionInCircleFilled } from '@universe/mycelium/icons/QuestionInCircleFilled'
import { UserCheck } from '@universe/mycelium/icons/UserCheck'
import { UserLock } from '@universe/mycelium/icons/UserLock'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoTooltip } from 'uniswap/src/components/tooltip/InfoTooltip'
import { useActiveAddress } from 'uniswap/src/features/accounts/store/hooks'
import { useAuctionKycStatus } from '~/features/Toucan/Auction/hooks/useAuctionKycStatus'
import { useIsQuickLaunchAuction } from '~/features/Toucan/Auction/hooks/useIsQuickLaunchAuction'
import { useAuctionStore } from '~/features/Toucan/Auction/store/useAuctionStore'

// No rest spread on purpose: TouchableArea injects legacy color props into unmarked direct
// children; the icons inside set explicit colors, so the injected props must not reach the Flex.
const IconContainer = ({ active, children }: { active: boolean; children?: ReactNode }): JSX.Element => (
  <Flex
    width={24}
    height={24}
    borderRadius="$roundedFull"
    justifyContent="center"
    alignItems="center"
    backgroundColor={active ? '$statusSuccess2' : '$surface3'}
  >
    {children}
  </Flex>
)

interface AuctionAccessIndicatorsProps {
  /**
   * The auction's ceiling, formatted as an FDV. Passed in rather than derived here so the
   * header and the bid form quote one value from one derivation.
   */
  maxBidPriceFdvFormatted?: string
  bidTokenSymbol?: string
}

export function AuctionAccessIndicators({
  maxBidPriceFdvFormatted,
  bidTokenSymbol,
}: AuctionAccessIndicatorsProps): JSX.Element | null {
  const { t } = useTranslation()
  const auctionAddress = useAuctionStore((state) => state.auctionAddress)
  const chainId = useAuctionStore((state) => state.auctionDetails?.chainId)
  const address = useActiveAddress((chainId ?? UniverseChainId.Sepolia) as UniverseChainId)
  const kycStatus = useAuctionKycStatus({
    walletAddress: address,
    auctionAddress,
    chainId,
  })

  // QuickLaunch: quick launches have no max-FDV input, so the help copy only mentions a budget.
  const isQuickLaunch = useIsQuickLaunchAuction()

  const getWhitelistTooltipText = (): string | undefined => {
    if (kycStatus.isAllowlisted) {
      return t('toucan.kyc.verifyIdentity.whitelisted')
    }
    return t('toucan.kyc.verifyIdentity.notWhitelisted')
  }

  const getVerificationTooltipText = (): string | undefined => {
    switch (kycStatus.status) {
      case KycVerificationStatus.VERIFICATION_STATUS_COMPLETED:
        return t('toucan.kyc.verifyIdentity.verified')
      case KycVerificationStatus.VERIFICATION_STATUS_PENDING:
        return t('toucan.kyc.verifyIdentity.pending')
      default:
        return t('toucan.kyc.verifyIdentity.notVerified')
    }
  }

  const whitelistTooltipContent = (
    <Flex p="$spacing4">
      <Text variant="body4" color="$neutral1">
        {getWhitelistTooltipText()}
      </Text>
    </Flex>
  )

  const verificationTooltipContent = (
    <Flex p="$spacing4">
      <Text variant="body4" color="$neutral1">
        {getVerificationTooltipText()}
      </Text>
    </Flex>
  )

  // The ceiling is explained up here as well as on the slider, because the slider only says
  // it once a bid has already run into the limit. Quick launches included: their peg is
  // clamped to the ceiling too (useBidFormController), and with the max-FDV input hidden
  // this tooltip is the ONLY place that would mention it.
  const ceilingTooltipText = maxBidPriceFdvFormatted
    ? t('toucan.auction.bidForm.maxBidPriceNotice.tooltip', {
        value: maxBidPriceFdvFormatted,
        symbol: bidTokenSymbol ? ` ${bidTokenSymbol}` : '',
      })
    : undefined

  const placeABidTooltipText = [
    isQuickLaunch ? t('toucan.bidForm.placeABid.tooltip.quickLaunch') : t('toucan.bidForm.placeABid.tooltip'),
    ceilingTooltipText,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Flex flexDirection="row" gap="$spacing8" justifyContent="space-between">
      <Text variant="subheading2" color="$neutral2">
        {t('toucan.bidForm.placeABid')}
      </Text>
      <Flex flexDirection="row" gap="$spacing8">
        <InfoTooltip
          placement="top"
          trigger={<QuestionInCircleFilled color="$neutral2" size="$icon.20" />}
          text={placeABidTooltipText}
        />
        {kycStatus.auctionHasPresale && (
          <InfoTooltip
            placement="top"
            trigger={
              <TouchableArea>
                <IconContainer active={kycStatus.isAllowlisted}>
                  {kycStatus.isAllowlisted ? (
                    <EnvelopeCheck color="$statusSuccess" size="$icon.16" />
                  ) : (
                    <EnvelopeLock color="$neutral1" size="$icon.16" />
                  )}
                </IconContainer>
              </TouchableArea>
            }
            text={whitelistTooltipContent}
          />
        )}
        {kycStatus.auctionNeedsVerification && (
          <InfoTooltip
            placement="top"
            trigger={
              <TouchableArea>
                <IconContainer active={kycStatus.status === KycVerificationStatus.VERIFICATION_STATUS_COMPLETED}>
                  {kycStatus.status === KycVerificationStatus.VERIFICATION_STATUS_COMPLETED ? (
                    <UserCheck color="$statusSuccess" size="$icon.16" />
                  ) : (
                    <UserLock color="$neutral1" size="$icon.16" />
                  )}
                </IconContainer>
              </TouchableArea>
            }
            text={verificationTooltipContent}
          />
        )}
      </Flex>
    </Flex>
  )
}
