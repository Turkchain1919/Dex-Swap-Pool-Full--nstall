import { Flex, Text, TouchableArea } from '@universe/mycelium'
import { Minus } from '@universe/mycelium/icons/Minus'
import { forwardRef, useImperativeHandle, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ElementName } from 'uniswap/src/features/telemetry/constants'
import Trace from 'uniswap/src/features/telemetry/Trace'
import {
  DateRangePickerCard,
  type DateRangePickerCardHandle,
} from '~/pages/Liquidity/CreateAuction/components/DatePicker/DateRangePickerCard'
import { useCreateAuctionTokenColor } from '~/pages/Liquidity/CreateAuction/hooks/useCreateAuctionTokenColor'
import { getMinStartTime } from '~/pages/Liquidity/CreateAuction/utils/duration'

type PreBidPeriodCardProps = {
  preBidStartTime: Date
  /**
   * The auction's emission start — the Duration section's "Start date". Rendered here a
   * second time as "Pre-bid end date", because the pre-bid window ends exactly where
   * emission begins; there is one boundary, editable from either place.
   */
  startTime: Date | undefined
  onChange: (next: { preBidStartTime: Date | undefined; startTime: Date | undefined }) => void
  onRemove: () => void
}

export type PreBidPeriodCardHandle = {
  /** Opens this module's calendar on the pre-bid start — the field the Duration card cannot reach. */
  openStartCalendar: () => void
}

/**
 * The optional pre-bid window, rendered as a module under Duration. Bidding opens at
 * `preBidStartTime`; nothing is released until `startTime`, so bids accumulate against a
 * fixed supply.
 *
 * Deliberately the same `DateRangePickerCard` the Duration row uses rather than two standalone
 * pickers: the pre-bid window and the emission start are one contiguous range, so the shared
 * calendar keeps the mirrored boundary consistent and clamps day clicks to that order.
 *
 * Day clicks only — `handleStartTimeChange` clamps against `minStartDate` alone, so editing the
 * pre-bid start TIME past the emission start still produces an out-of-order pair. That is caught
 * downstream by `isPreBidRangeValid` (error shown, Continue and the request both blocked), so the
 * invariant is enforced, just not by this picker.
 */
export const PreBidPeriodCard = forwardRef<PreBidPeriodCardHandle, PreBidPeriodCardProps>(function PreBidPeriodCard(
  { preBidStartTime, startTime, onChange, onRemove },
  ref,
) {
  const { t } = useTranslation()
  const tokenColor = useCreateAuctionTokenColor()
  const pickerRef = useRef<DateRangePickerCardHandle>(null)

  useImperativeHandle(ref, () => ({ openStartCalendar: () => pickerRef.current?.openCalendar('start') }), [])

  return (
    <Flex borderWidth={1} borderColor="$surface3" borderRadius="$rounded20" p="$spacing16" gap="$spacing12">
      <Flex row alignItems="center" justifyContent="space-between" gap="$spacing12">
        <Text variant="subheading2" color="$neutral1">
          {t('toucan.createAuction.step.configureAuction.preBid')}
        </Text>
        <Trace logPress element={ElementName.AuctionPreBidRemove}>
          <TouchableArea
            p="$spacing4"
            borderRadius="$roundedFull"
            hoverStyle={{ backgroundColor: '$surface3' }}
            aria-label={t('toucan.createAuction.step.configureAuction.preBid.remove')}
            onPress={onRemove}
          >
            <Minus size="$icon.16" color="$neutral2" />
          </TouchableArea>
        </Trace>
      </Flex>
      <DateRangePickerCard
        ref={pickerRef}
        startLabel={t('toucan.createAuction.step.configureAuction.preBid.startDate')}
        endLabel={t('toucan.createAuction.step.configureAuction.preBid.endDate')}
        startTimeLabel={t('toucan.createAuction.step.configureAuction.duration.startTime')}
        endTimeLabel={t('toucan.createAuction.step.configureAuction.duration.endTime')}
        startDate={preBidStartTime}
        endDate={startTime}
        minStartDate={getMinStartTime()}
        startPlaceholder={t('toucan.createAuction.step.configureAuction.preBid.startDate.placeholder')}
        endPlaceholder={t('toucan.createAuction.step.configureAuction.duration.startDate.placeholder')}
        ariaLabelStart={t('toucan.createAuction.step.configureAuction.preBid.startDate')}
        ariaLabelEnd={t('toucan.createAuction.step.configureAuction.preBid.endDate')}
        tokenColor={tokenColor}
        traceElementStart={ElementName.AuctionPreBidStartDatetime}
        traceElementEnd={ElementName.AuctionPreBidEndDatetime}
        // `endDate` here IS the auction's start time, so editing the "Pre-bid end date"
        // moves the Duration section's start date — the bidirectional edit the design calls for.
        //
        // Both sides fall back to their current value rather than passing an undefined through.
        // The range picker clears the far end when a start lands past it, so picking a pre-bid
        // start after the emission start would otherwise wipe the emission start — and an
        // undefined pre-bid start would unmount this module, removing the window through a date
        // click instead of the Remove button. Neither is a state a date click should be able to
        // reach: clearing is the Remove button's job.
        onChange={(next) =>
          onChange({
            preBidStartTime: next.startDate ?? preBidStartTime,
            startTime: next.endDate ?? startTime,
          })
        }
      />
      <Text variant="body4" color="$neutral2">
        {t('toucan.createAuction.step.configureAuction.preBid.description')}
      </Text>
    </Flex>
  )
})
