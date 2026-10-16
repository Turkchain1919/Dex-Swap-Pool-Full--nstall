import { Flex, Text, TouchableArea } from '@universe/mycelium'
import { X } from '@universe/mycelium/icons/X'
import { useSporeColors } from '@universe/mycelium/theme-hooks-compat'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AddRangeRow,
  CustomPriceRangeRow,
  FullRangeRemainderRow,
  HeaderColumnLabel,
  PriceBoundColumnHeader,
  PriceRangeRowShell,
  RANGE_ROW_LEADING_SIZE,
} from '~/pages/Liquidity/CreateAuction/components/CustomPriceRangeEditorTable'
import {
  getCustomPriceHistogramLayers,
  PriceHistogram,
} from '~/pages/Liquidity/CreateAuction/components/PriceHistogram'
import {
  type CustomPriceRangeEntry,
  type CustomPriceRangePreset,
  MAX_CUSTOM_PRICE_RANGE_ENTRIES,
  PriceRangeStrategy,
} from '~/pages/Liquidity/CreateAuction/types'
import {
  FULL_RANGE_REMAINDER_ENTRY_ID,
  getCustomPriceRangeFullRangeRemainderPercent,
  getCustomPriceRangeTotalProblem,
  shouldShowFullRangeRemainder,
  withFullRangeRemainderEntry,
} from '~/pages/Liquidity/CreateAuction/utils'

export function CustomPriceRangeEditor({
  entries,
  histogramBarColor,
  onAddPreset,
  onUpdateLiquidityPercent,
  onUpdateBounds,
  onRemoveEntry,
}: {
  entries: CustomPriceRangeEntry[]
  histogramBarColor: string
  onAddPreset: (preset: CustomPriceRangePreset) => void
  onUpdateLiquidityPercent: (entryId: string, percent: number) => void
  onUpdateBounds: (
    entryId: string,
    bounds: Partial<Pick<CustomPriceRangeEntry, 'minPercentFromClearing' | 'maxPercentFromClearing'>>,
  ) => void
  onRemoveEntry: (entryId: string) => void
}) {
  const { t } = useTranslation()
  const sporeColors = useSporeColors()
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null)
  const canAddEntry = entries.length < MAX_CUSTOM_PRICE_RANGE_ENTRIES

  const remainderPercent = getCustomPriceRangeFullRangeRemainderPercent(entries)
  const showRemainderRow = shouldShowFullRangeRemainder(entries)

  // The remainder is a real position, so the histogram draws it alongside the rows.
  const histogramEntries = useMemo(() => withFullRangeRemainderEntry(entries), [entries])

  const rowHistogramColorByEntryId = useMemo(() => {
    const layers = getCustomPriceHistogramLayers({
      entries: histogramEntries,
      barColor: histogramBarColor,
      neutral1Color: sporeColors.neutral1.val,
    })
    return new Map(layers.map((layer) => [layer.entryId, layer.color]))
  }, [histogramEntries, histogramBarColor, sporeColors.neutral1.val])

  // Same predicate the step gate reads, so the copy below can't disagree with whether Continue works.
  const totalProblem = useMemo(() => getCustomPriceRangeTotalProblem(entries), [entries])

  return (
    <Flex gap="$spacing16">
      <PriceHistogram
        strategy={PriceRangeStrategy.CUSTOM_RANGE}
        customPriceRanges={histogramEntries}
        barColor={histogramBarColor}
        activeEntryId={activeEntryId}
        onHoverEntry={setActiveEntryId}
      />
      <Flex gap="$spacing8">
        <PriceRangeRowShell
          rowAlignItems="flex-start"
          leading={
            <Flex
              width={RANGE_ROW_LEADING_SIZE}
              height={RANGE_ROW_LEADING_SIZE}
              borderRadius="$roundedFull"
              backgroundColor="$transparent"
            />
          }
          column1={
            <HeaderColumnLabel>
              {t('toucan.createAuction.step.customizePool.priceRange.custom.liquidityPercent')}
            </HeaderColumnLabel>
          }
          column2={
            <PriceBoundColumnHeader
              label={t('toucan.createAuction.step.customizePool.priceRange.custom.minimumPrice')}
            />
          }
          column3={
            <PriceBoundColumnHeader
              label={t('toucan.createAuction.step.customizePool.priceRange.custom.maximumPrice')}
            />
          }
          trailing={
            <TouchableArea centered disabled opacity={0} aria-hidden tabIndex={-1}>
              <X size="$icon.16" color="$neutral2" />
            </TouchableArea>
          }
        />
        {entries.map((entry) => (
          <CustomPriceRangeRow
            key={entry.id}
            entry={entry}
            rowHistogramColor={rowHistogramColorByEntryId.get(entry.id) ?? histogramBarColor}
            canRemove={entries.length > 1}
            isActive={activeEntryId === entry.id}
            onHoverEntry={setActiveEntryId}
            onUpdateLiquidityPercent={(percent) => onUpdateLiquidityPercent(entry.id, percent)}
            onUpdateBounds={(bounds) => onUpdateBounds(entry.id, bounds)}
            onRemove={() => onRemoveEntry(entry.id)}
          />
        ))}
        {showRemainderRow && (
          <FullRangeRemainderRow
            remainderPercent={remainderPercent}
            rowHistogramColor={rowHistogramColorByEntryId.get(FULL_RANGE_REMAINDER_ENTRY_ID) ?? histogramBarColor}
            isActive={activeEntryId === FULL_RANGE_REMAINDER_ENTRY_ID}
            onHoverEntry={setActiveEntryId}
          />
        )}
        <AddRangeRow canAddEntry={canAddEntry} onAddPreset={onAddPreset} />
      </Flex>
      {(!canAddEntry || totalProblem !== undefined) && (
        <Flex gap="$spacing4">
          {!canAddEntry && (
            <Text variant="body3" color="$neutral2" textAlign="center">
              {t('toucan.createAuction.step.customizePool.priceRange.custom.maxRangesReached', {
                count: MAX_CUSTOM_PRICE_RANGE_ENTRIES,
              })}
            </Text>
          )}
          {totalProblem === 'overAllocated' && (
            <Text variant="body3" color="$statusCritical" textAlign="center">
              {t('toucan.createAuction.step.customizePool.priceRange.custom.totalCannotExceed100')}
            </Text>
          )}
          {totalProblem === 'unallocated' && (
            <Text variant="body3" color="$statusCritical" textAlign="center">
              {t('toucan.createAuction.step.customizePool.priceRange.custom.totalMustBeAboveZero')}
            </Text>
          )}
        </Flex>
      )}
    </Flex>
  )
}
