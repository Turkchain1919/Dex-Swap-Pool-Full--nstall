import { fireEvent } from '@testing-library/react'
import i18n from 'uniswap/src/i18n'
import { ReviewCustomPriceRangeExpandable } from '~/pages/Liquidity/CreateAuction/components/ReviewCustomPriceRangeExpandable'
import { CUSTOM_PRICE_RANGE_POSITIVE_INFINITY, type CustomPriceRangeEntry } from '~/pages/Liquidity/CreateAuction/types'
import { render, screen } from '~/test-utils/render'

const HELP = i18n.t('toucan.createAuction.step.customizePool.priceRange.custom.fullRangeRemainderHelp')

function fieldLabel(fieldKey: 'liquidityPercent' | 'minimumPrice' | 'maximumPrice'): string {
  return i18n.t('toucan.createAuction.step.customizePool.priceRange.custom.fullRangeRemainderFieldLabel', {
    field: i18n.t(`toucan.createAuction.step.customizePool.priceRange.custom.${fieldKey}`),
  })
}

function renderExpanded(...percents: number[]) {
  const entries: CustomPriceRangeEntry[] = percents.map((liquidityPercent, index) => ({
    id: `custom-range-${index + 1}`,
    liquidityPercent,
    minPercentFromClearing: -50,
    maxPercentFromClearing: index === 0 ? CUSTOM_PRICE_RANGE_POSITIVE_INFINITY : 100,
  }))
  render(<ReviewCustomPriceRangeExpandable label="Price range" summaryLabel="Custom" entries={entries} />)
  fireEvent.click(screen.getByLabelText(i18n.t('common.showMore.button')))
}

describe('ReviewCustomPriceRangeExpandable full-range remainder', () => {
  it('explains and names the remainder row the user never entered', () => {
    renderExpanded(30, 15)

    // This is the last screen before signing, so the row cannot be three anonymous numbers.
    expect(screen.getByLabelText(HELP)).toBeInTheDocument()
    expect(screen.getByLabelText(fieldLabel('liquidityPercent'))).toHaveTextContent('55%')
    expect(screen.getByLabelText(fieldLabel('minimumPrice'))).toHaveTextContent('-100%')
    expect(screen.getByLabelText(fieldLabel('maximumPrice'))).toHaveTextContent('+∞%')
  })

  it('renders no remainder row when the ranges allocate the whole budget', () => {
    renderExpanded(100)

    expect(screen.queryByLabelText(HELP)).toBeNull()
    expect(screen.queryByLabelText(fieldLabel('liquidityPercent'))).toBeNull()
  })
})
