import { useTranslation } from 'react-i18next'
import { InlineAlertBanner } from '~/features/Toucan/Shared/InlineAlertBanner'

interface BidFormStateBannersProps {
  showDisabledState: boolean
  showMaxBidPriceReachedState: boolean
}

/**
 * The mutually exclusive banners above the bid inputs. A concluded auction outranks a
 * reached ceiling. The still-open ceiling renders as a hint under the slider instead.
 */
export function BidFormStateBanners({
  showDisabledState,
  showMaxBidPriceReachedState,
}: BidFormStateBannersProps): JSX.Element | null {
  const { t } = useTranslation()

  if (showDisabledState) {
    return (
      <InlineAlertBanner
        title={t('toucan.auction.bidForm.auctionConcluded')}
        description={t('toucan.auction.bidForm.auctionConcluded.description')}
      />
    )
  }

  if (showMaxBidPriceReachedState) {
    return (
      <InlineAlertBanner
        title={t('toucan.auction.bidForm.maxBidPriceReached')}
        description={t('toucan.auction.bidForm.maxBidPriceReached.description')}
      />
    )
  }

  return null
}
