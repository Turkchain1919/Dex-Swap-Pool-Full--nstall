import i18n from 'uniswap/src/i18n'
import { CustomPriceRangeEditor } from '~/pages/Liquidity/CreateAuction/components/CustomPriceRangeEditor'
import {
  type CustomPriceRangeEntry,
  CUSTOM_PRICE_RANGE_POSITIVE_INFINITY,
  MAX_CUSTOM_PRICE_RANGE_ENTRIES,
} from '~/pages/Liquidity/CreateAuction/types'
import { render, screen } from '~/test-utils/render'

// Resolved through i18n so the plural form tracks the cap instead of hardcoding the `_other` copy.
const AT_LIMIT_MESSAGE = i18n.t('toucan.createAuction.step.customizePool.priceRange.custom.maxRangesReached', {
  count: MAX_CUSTOM_PRICE_RANGE_ENTRIES,
})

function buildEntries(count: number): CustomPriceRangeEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `custom-range-${index + 1}`,
    liquidityPercent: 100 / count,
    minPercentFromClearing: index === 0 ? -100 : -50,
    maxPercentFromClearing: index === 0 ? CUSTOM_PRICE_RANGE_POSITIVE_INFINITY : 100,
  }))
}

function renderEditor(entriesOrCount: number | CustomPriceRangeEntry[]) {
  return render(
    <CustomPriceRangeEditor
      entries={typeof entriesOrCount === 'number' ? buildEntries(entriesOrCount) : entriesOrCount}
      histogramBarColor="#FC72FF"
      onAddPreset={() => {}}
      onUpdateLiquidityPercent={() => {}}
      onUpdateBounds={() => {}}
      onRemoveEntry={() => {}}
    />,
  )
}

function entriesTotalling(...percents: number[]): CustomPriceRangeEntry[] {
  return percents.map((liquidityPercent, index) => ({
    id: `custom-range-${index + 1}`,
    liquidityPercent,
    minPercentFromClearing: -50,
    maxPercentFromClearing: 100,
  }))
}

describe('CustomPriceRangeEditor at-limit message', () => {
  it('stays hidden while more ranges can be added', () => {
    renderEditor(MAX_CUSTOM_PRICE_RANGE_ENTRIES - 1)

    expect(screen.queryByText(AT_LIMIT_MESSAGE)).toBeNull()
  })

  it('shows the maximum-ranges message once the limit is reached', () => {
    renderEditor(MAX_CUSTOM_PRICE_RANGE_ENTRIES)

    expect(screen.getByText(AT_LIMIT_MESSAGE)).toBeInTheDocument()
  })
})

const FULL_RANGE_HELP = i18n.t('toucan.createAuction.step.customizePool.priceRange.custom.fullRangeRemainderHelp')
const OVER_100_MESSAGE = i18n.t('toucan.createAuction.step.customizePool.priceRange.custom.totalCannotExceed100')
const ZERO_MESSAGE = i18n.t('toucan.createAuction.step.customizePool.priceRange.custom.totalMustBeAboveZero')

describe('CustomPriceRangeEditor full-range remainder row', () => {
  it('stays hidden when the ranges allocate the whole budget', () => {
    renderEditor(entriesTotalling(100))

    expect(screen.queryByLabelText(FULL_RANGE_HELP)).toBeNull()
  })

  it('reports the unallocated share as a read-only full-range row', () => {
    renderEditor(entriesTotalling(30, 15))

    // Same three fields as an editable row, disabled, fixed at the full range.
    const remainderPercent = screen.getByDisplayValue('55')
    expect(remainderPercent).toHaveAttribute('readonly')
    for (const bound of ['-100', '+∞']) {
      expect(screen.getByDisplayValue(bound)).toHaveAttribute('readonly')
    }
    expect(screen.getByLabelText(FULL_RANGE_HELP)).toBeInTheDocument()

    // The row looks like any other, so assistive tech gets the identity the visuals carry, and the
    // fields stay out of the tab order rather than firing range-edit focus analytics.
    for (const field of ['liquidityPercent', 'minimumPrice', 'maximumPrice'] as const) {
      const labelled = screen.getByLabelText(
        i18n.t('toucan.createAuction.step.customizePool.priceRange.custom.fullRangeRemainderFieldLabel', {
          field: i18n.t(`toucan.createAuction.step.customizePool.priceRange.custom.${field}`),
        }),
      )
      expect(labelled).toHaveAttribute('readonly')
      expect(labelled).toHaveAttribute('tabindex', '-1')
    }
  })

  it('accepts a total below 100 without an error, and explains the remainder on hover', () => {
    renderEditor(entriesTotalling(45))

    expect(screen.queryByText(OVER_100_MESSAGE)).toBeNull()
    // The hover help is what tells the user the shortfall is deliberate rather than unfinished.
    expect(screen.getByLabelText(FULL_RANGE_HELP)).toBeInTheDocument()
  })

  it('flags a total above 100, and shows no remainder for it', () => {
    renderEditor(entriesTotalling(80, 40))

    expect(screen.getByText(OVER_100_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByLabelText(FULL_RANGE_HELP)).toBeNull()
  })

  it('shows only the blocking error at a total of zero, not a 100% full-range row', () => {
    renderEditor(entriesTotalling(0))

    expect(screen.getByText(ZERO_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByLabelText(FULL_RANGE_HELP)).toBeNull()
  })
})
