import { Flex, Text } from '@universe/mycelium'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FdvArrowMarker } from '~/features/Toucan/Auction/Bids/BidDetailsModal/FdvArrowMarker'
import { useBidStatusColors } from '~/features/Toucan/Auction/hooks/useBidStatusColors'
import { type BidDisplayState } from '~/features/Toucan/Auction/utils/bidDetails'
import { ProgressBar } from '~/features/Toucan/Shared/ProgressBar'

interface BidFdvSummaryProps {
  currentFdvDisplay: string
  maxFdvDisplay: string
  /** `null` when FDV is unknown — the range bar renders empty and unmarked rather than at 0%. */
  fdvFraction: number | null
  displayState: BidDisplayState
  isAuctionEnded?: boolean
}

export function BidFdvSummary({
  currentFdvDisplay,
  maxFdvDisplay,
  fdvFraction,
  displayState,
  isAuctionEnded,
}: BidFdvSummaryProps): JSX.Element {
  const { t } = useTranslation()
  const { inRangeColor, warningColor, outOfRangeColor } = useBidStatusColors()
  const currentFdvColor = displayState === 'outOfRange' ? outOfRangeColor : '$neutral1'

  const fdvGradient = useMemo(() => {
    return `linear-gradient(90deg, ${inRangeColor} 0%, ${warningColor} 50%, ${outOfRangeColor} 100%)`
  }, [inRangeColor, outOfRangeColor, warningColor])

  const arrowLeft = useMemo(
    () => (fdvFraction === null ? undefined : `calc(${Math.min(Math.max(fdvFraction, 0), 1) * 100}% - 6px)`),
    [fdvFraction],
  )
  const hasFdv = fdvFraction !== null

  return (
    <Flex flex={1} minWidth={0} flexBasis={0} gap="$spacing12">
      <Flex row justifyContent="space-between" gap="$spacing8">
        <Flex gap="$spacing2">
          <Text variant="body4" color="$neutral2">
            {isAuctionEnded ? t('toucan.bidDetails.label.fdvAtLaunch') : t('toucan.bidDetails.label.currentFdv')}
          </Text>
          <Text variant="body3" color={currentFdvColor}>
            {currentFdvDisplay}
          </Text>
        </Flex>
        <Flex gap="$spacing2" alignItems="flex-end">
          <Text variant="body4" color="$neutral2">
            {t('toucan.bidDetails.label.maxFdv')}
          </Text>
          <Text variant="body3" color="$neutral1">
            {maxFdvDisplay}
          </Text>
        </Flex>
      </Flex>
      <Flex position="relative">
        <ProgressBar
          percentage={hasFdv ? 100 : 0}
          color={inRangeColor}
          borderColor="$surface3"
          height={8}
          showWhiteDot={false}
          showEndDots={false}
          customFillStyle={hasFdv ? { backgroundImage: fdvGradient } : undefined}
          shouldAnimate={false}
        />
        {hasFdv && (
          <Flex position="absolute" top={-10} style={{ left: arrowLeft }}>
            <FdvArrowMarker />
          </Flex>
        )}
      </Flex>
    </Flex>
  )
}
