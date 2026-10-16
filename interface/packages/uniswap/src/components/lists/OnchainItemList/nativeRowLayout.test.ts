import {
  OnchainItemListOptionType,
  type RwaCollectionOption,
  type TokenOption,
} from 'uniswap/src/components/lists/items/types'
import {
  getNativeRowFixedSize,
  getNativeRowItemType,
  NativeRowType,
} from 'uniswap/src/components/lists/OnchainItemList/nativeRowLayout'
import {
  type ProcessedRow,
  processSectionsToRows,
} from 'uniswap/src/components/lists/OnchainItemList/processSectionsToRows'
import { type OnchainItemSection, OnchainItemSectionName } from 'uniswap/src/components/lists/OnchainItemList/types'

const token = { type: OnchainItemListOptionType.Token, currencyInfo: { currencyId: 'token-a' } } as TokenOption

const groupedCollection = {
  type: OnchainItemListOptionType.RwaCollection,
  rowLayout: { dynamicHeight: true, collapsedHeightPx: 72, expandedHeightPx: 212 },
} as RwaCollectionOption

const singleIssuerCollection = {
  type: OnchainItemListOptionType.RwaCollection,
  rowLayout: { dynamicHeight: false, collapsedHeightPx: 72, expandedHeightPx: 72 },
} as RwaCollectionOption

function rowsFor(section: OnchainItemSection<TokenOption | TokenOption[] | RwaCollectionOption>): {
  header: ProcessedRow
  item: ProcessedRow
} {
  const [header, item] = processSectionsToRows({
    sections: [section],
    expandedItems: ['expanded'],
    keyExtractor: (option) => (option === groupedCollection ? 'expanded' : 'collapsed'),
  })
  if (!header || !item) {
    throw new Error('expected a header row and an item row')
  }
  return { header, item }
}

describe('getNativeRowItemType', () => {
  it('types section headers, token rows, horizontal pill rows and expandable rows separately', () => {
    const { header, item } = rowsFor({ sectionKey: OnchainItemSectionName.YourTokens, data: [token] })
    expect(getNativeRowItemType(header)).toBe(NativeRowType.Header)
    expect(getNativeRowItemType(item)).toBe(NativeRowType.Item)

    const pills = rowsFor({ sectionKey: OnchainItemSectionName.SuggestedTokens, data: [[token, token]] })
    expect(getNativeRowItemType(pills.item)).toBe(NativeRowType.HorizontalItem)

    const grouped = rowsFor({ sectionKey: OnchainItemSectionName.Stocks, data: [groupedCollection] })
    expect(getNativeRowItemType(grouped.item)).toBe(NativeRowType.DynamicHeightItem)
  })

  it('keeps a single-issuer collection row on the fixed-height item type', () => {
    const { item } = rowsFor({ sectionKey: OnchainItemSectionName.Stocks, data: [singleIssuerCollection] })
    expect(getNativeRowItemType(item)).toBe(NativeRowType.Item)
  })
})

describe('getNativeRowFixedSize', () => {
  it('leaves measured rows alone: default headers, token rows and horizontal pill rows', () => {
    const { header, item } = rowsFor({ sectionKey: OnchainItemSectionName.YourTokens, data: [token] })
    expect(getNativeRowFixedSize(header)).toBeUndefined()
    expect(getNativeRowFixedSize(item)).toBeUndefined()

    const pills = rowsFor({ sectionKey: OnchainItemSectionName.SuggestedTokens, data: [[token]] })
    expect(getNativeRowFixedSize(pills.item)).toBeUndefined()
  })

  it('gives the suggested-tokens header no height, since it renders nothing', () => {
    const { header } = rowsFor({ sectionKey: OnchainItemSectionName.SuggestedTokens, data: [[token]] })
    expect(getNativeRowFixedSize(header)).toBe(0)
  })

  it('returns the rowLayout height for expandable rows, following their expanded state', () => {
    const expanded = rowsFor({ sectionKey: OnchainItemSectionName.Stocks, data: [groupedCollection] })
    expect(getNativeRowFixedSize(expanded.item)).toBe(212)

    const [, collapsed] = processSectionsToRows({
      sections: [{ sectionKey: OnchainItemSectionName.Stocks, data: [groupedCollection] }],
      expandedItems: [],
    })
    expect(collapsed && getNativeRowFixedSize(collapsed)).toBe(72)
  })

  it('does not force a single-issuer collection row, whose rowLayout is not dynamic', () => {
    const { item } = rowsFor({ sectionKey: OnchainItemSectionName.Stocks, data: [singleIssuerCollection] })
    expect(getNativeRowFixedSize(item)).toBeUndefined()
  })
})
