import { Flex, Text, TouchableArea } from '@universe/mycelium'
import { RotatableChevron } from '@universe/mycelium/icons/RotatableChevron'
import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocalizationContext } from 'uniswap/src/features/language/LocalizationContext'
import {
  formatPriceRangeBound,
  normalizeSignedInput,
} from '~/pages/Liquidity/CreateAuction/components/customPriceRangeEditorFormatting'
import {
  FullRangeRemainderHelp,
  PriceBoundColumnHeader,
} from '~/pages/Liquidity/CreateAuction/components/CustomPriceRangeEditorTable'
import { type CustomPriceRangeEntry } from '~/pages/Liquidity/CreateAuction/types'
import {
  CUSTOM_PRICE_RANGE_PERCENT_DISPLAY_DECIMALS,
  FULL_RANGE_REMAINDER_BOUNDS,
  getCustomPriceRangeFullRangeRemainderPercent,
  shouldShowFullRangeRemainder,
} from '~/pages/Liquidity/CreateAuction/utils'

const REVIEW_PRICE_RANGE_ROW_MIN_HEIGHT_PX = 29

/**
 * Review-only row layout (mirrors `PriceRangeRowShell` without leading/trailing).
 * Kept local so review typography/spacing does not depend on the customize-pool editor table.
 */
function ReviewPriceRangeTableRow({
  column1,
  column2,
  column3,
  rowAlignItems = 'center',
}: {
  column1: ReactNode
  column2: ReactNode
  column3: ReactNode
  rowAlignItems?: 'center' | 'flex-start'
}) {
  return (
    <Flex
      row
      alignItems={rowAlignItems}
      gap="$spacing8"
      width="100%"
      px="$spacing8"
      backgroundColor="$transparent"
      borderRadius="$rounded8"
    >
      <Flex
        flex={1}
        flexBasis={0}
        minWidth={0}
        gap="$spacing4"
        row
        width="100%"
        $platform-web={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
        }}
      >
        {column1}
        {column2}
        {column3}
      </Flex>
    </Flex>
  )
}

function ReviewTableHeaderLabel({ children }: { children: ReactNode }) {
  return (
    <Flex flex={1} flexBasis={0} minWidth={0} width="100%">
      <Text variant="body4" color="$neutral1" width="100%">
        {children}
      </Text>
    </Flex>
  )
}

function ReviewPriceRangeValueCell({
  children,
  accessibilityLabel,
  adornment,
}: {
  children: string
  /** Names the value for assistive tech; the remainder row has no visible label of its own. */
  accessibilityLabel?: string
  adornment?: ReactNode
}) {
  return (
    <Flex flex={1} flexBasis={0} minWidth={0} width="100%" row alignItems="center" gap="$spacing6">
      <Text variant="body4" color="$neutral1" numberOfLines={2} aria-label={accessibilityLabel}>
        {children}
      </Text>
      {adornment}
    </Flex>
  )
}

export function ReviewCustomPriceRangeExpandable({
  label,
  summaryLabel,
  entries,
}: {
  label: string
  summaryLabel: string
  entries: CustomPriceRangeEntry[]
}) {
  const { t } = useTranslation()
  const { formatPercent } = useLocalizationContext()
  const [expanded, setExpanded] = useState(false)
  // The full-range position the migrator opens for whatever the ranges leave unallocated. Shown
  // here for the same reason as in the editor: it is part of the launch being reviewed.
  const remainderPercent = getCustomPriceRangeFullRangeRemainderPercent(entries)
  const showRemainderRow = shouldShowFullRangeRemainder(entries)
  // This is the last screen before signing, and the remainder is a row the user never typed. It
  // carries the editor's explanation and the same per-field names, so neither a reader nor a screen
  // reader meets an unexplained range here.
  const remainderFieldLabel = (field: string): string =>
    t('toucan.createAuction.step.customizePool.priceRange.custom.fullRangeRemainderFieldLabel', { field })

  const formatFinitePercentValue = (value: number): string =>
    normalizeSignedInput(formatPercent(value, CUSTOM_PRICE_RANGE_PERCENT_DISPLAY_DECIMALS))

  const handleToggleExpanded = (): void => {
    setExpanded((prev) => !prev)
  }

  return (
    <Flex gap="$spacing8" width="100%">
      <Flex row justifyContent="space-between" alignItems="center" width="100%">
        <Text variant="body1" color="$neutral2">
          {label}
        </Text>
        <TouchableArea
          row
          alignItems="center"
          gap="$spacing6"
          onPress={handleToggleExpanded}
          aria-expanded={expanded}
          aria-label={expanded ? t('common.showLess.button') : t('common.showMore.button')}
        >
          <Text variant="body1" color="$neutral1">
            {summaryLabel}
          </Text>
          <RotatableChevron color="$neutral2" direction={expanded ? 'up' : 'down'} size="$icon.16" />
        </TouchableArea>
      </Flex>
      {expanded ? (
        <Flex
          gap={0}
          width="100%"
          backgroundColor="$surface2"
          borderRadius="$rounded12"
          borderWidth="$spacing1"
          borderColor="$surface3"
          pt="$spacing8"
          pb="$spacing12"
          px="$spacing12"
        >
          <Flex minHeight={REVIEW_PRICE_RANGE_ROW_MIN_HEIGHT_PX} width="100%" justifyContent="center">
            <ReviewPriceRangeTableRow
              rowAlignItems="flex-start"
              column1={
                <ReviewTableHeaderLabel>
                  {t('toucan.createAuction.step.customizePool.priceRange.custom.liquidityPercent')}
                </ReviewTableHeaderLabel>
              }
              column2={
                <PriceBoundColumnHeader
                  label={t('toucan.createAuction.step.customizePool.priceRange.custom.minimumPrice')}
                  showPercentFromClearingHint={false}
                />
              }
              column3={
                <PriceBoundColumnHeader
                  label={t('toucan.createAuction.step.customizePool.priceRange.custom.maximumPrice')}
                  showPercentFromClearingHint={false}
                />
              }
            />
          </Flex>
          {entries.map((entry, index) => (
            <Flex
              key={entry.id}
              width="100%"
              minHeight={REVIEW_PRICE_RANGE_ROW_MIN_HEIGHT_PX}
              justifyContent="center"
              borderBottomWidth={index < entries.length - 1 || showRemainderRow ? 1 : 0}
              borderBottomColor="$surface3"
            >
              <ReviewPriceRangeTableRow
                column1={
                  <ReviewPriceRangeValueCell>
                    {`${normalizeSignedInput(formatPercent(entry.liquidityPercent, CUSTOM_PRICE_RANGE_PERCENT_DISPLAY_DECIMALS))}%`}
                  </ReviewPriceRangeValueCell>
                }
                column2={
                  <ReviewPriceRangeValueCell>
                    {`${formatPriceRangeBound(entry.minPercentFromClearing, formatFinitePercentValue)}%`}
                  </ReviewPriceRangeValueCell>
                }
                column3={
                  <ReviewPriceRangeValueCell>
                    {`${formatPriceRangeBound(entry.maxPercentFromClearing, formatFinitePercentValue)}%`}
                  </ReviewPriceRangeValueCell>
                }
              />
            </Flex>
          ))}
          {showRemainderRow ? (
            <Flex width="100%" minHeight={REVIEW_PRICE_RANGE_ROW_MIN_HEIGHT_PX} justifyContent="center">
              <ReviewPriceRangeTableRow
                column1={
                  <ReviewPriceRangeValueCell
                    accessibilityLabel={remainderFieldLabel(
                      t('toucan.createAuction.step.customizePool.priceRange.custom.liquidityPercent'),
                    )}
                    adornment={<FullRangeRemainderHelp />}
                  >
                    {`${normalizeSignedInput(formatPercent(remainderPercent, CUSTOM_PRICE_RANGE_PERCENT_DISPLAY_DECIMALS))}%`}
                  </ReviewPriceRangeValueCell>
                }
                column2={
                  <ReviewPriceRangeValueCell
                    accessibilityLabel={remainderFieldLabel(
                      t('toucan.createAuction.step.customizePool.priceRange.custom.minimumPrice'),
                    )}
                  >
                    {`${formatPriceRangeBound(FULL_RANGE_REMAINDER_BOUNDS.minPercentFromClearing, formatFinitePercentValue)}%`}
                  </ReviewPriceRangeValueCell>
                }
                column3={
                  <ReviewPriceRangeValueCell
                    accessibilityLabel={remainderFieldLabel(
                      t('toucan.createAuction.step.customizePool.priceRange.custom.maximumPrice'),
                    )}
                  >
                    {`${formatPriceRangeBound(FULL_RANGE_REMAINDER_BOUNDS.maxPercentFromClearing, formatFinitePercentValue)}%`}
                  </ReviewPriceRangeValueCell>
                }
              />
            </Flex>
          ) : null}
        </Flex>
      ) : null}
    </Flex>
  )
}
