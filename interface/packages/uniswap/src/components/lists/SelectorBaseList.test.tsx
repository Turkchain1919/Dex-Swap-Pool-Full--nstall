import { UniverseChainId } from '@universe/chains'
import { Text } from '@universe/mycelium'
import { useEffect } from 'react'
import { OnchainItemListOptionType, type TokenOption } from 'uniswap/src/components/lists/items/types'
import type { OnchainItemListProps } from 'uniswap/src/components/lists/OnchainItemList/OnchainItemList'
import { type OnchainItemSection, OnchainItemSectionName } from 'uniswap/src/components/lists/OnchainItemList/types'
import { SelectorBaseList } from 'uniswap/src/components/lists/SelectorBaseList'
import { render } from 'uniswap/src/test/test-utils'

const { scrollToLocation } = vi.hoisted(() => ({ scrollToLocation: vi.fn() }))

// Stand in for the platform list: report how many sections reached it and expose the imperative handle the
// selector scrolls through.
vi.mock('uniswap/src/components/lists/OnchainItemList/OnchainItemList', () => ({
  OnchainItemList: ({ sections, sectionListRef }: OnchainItemListProps<TokenOption>): JSX.Element => {
    useEffect(() => {
      if (sectionListRef) {
        sectionListRef.current = { scrollToLocation }
      }
    }, [sectionListRef])
    return <Text testID="list">{`sections:${sections.length}`}</Text>
  },
}))

const token = { type: OnchainItemListOptionType.Token, currencyInfo: { currencyId: 'token-a' } } as TokenOption

function sectionsOf(...keys: OnchainItemSectionName[]): OnchainItemSection<TokenOption>[] {
  return keys.map((sectionKey) => ({ sectionKey, data: [token] }))
}

const yourTokens = sectionsOf(OnchainItemSectionName.YourTokens)
const yourTokensAndTrending = sectionsOf(OnchainItemSectionName.YourTokens, OnchainItemSectionName.TrendingTokens)

function renderList({
  sections,
  loading,
  chainFilter = null,
}: {
  sections?: OnchainItemSection<TokenOption>[]
  loading?: boolean
  chainFilter?: UniverseChainId | null
}): JSX.Element {
  return (
    <SelectorBaseList<TokenOption>
      chainFilter={chainFilter}
      keyExtractor={(option) => option.currencyInfo.currencyId}
      loading={loading}
      loadingElement={<Text testID="skeleton">loading</Text>}
      renderedInModal={false}
      renderItem={() => <Text>row</Text>}
      sections={sections}
    />
  )
}

beforeEach(() => {
  scrollToLocation.mockClear()
})

describe('SelectorBaseList', () => {
  it('shows the skeleton before the first load', () => {
    const { queryByTestId } = render(renderList({ loading: true }))

    expect(queryByTestId('skeleton')).toBeTruthy()
    expect(queryByTestId('list')).toBeNull()
  })

  it('scrolls to the top for a new chain filter once its rows exist, not when the section count changes', () => {
    const { rerender } = render(renderList({ sections: yourTokens, chainFilter: UniverseChainId.Mainnet }))
    expect(scrollToLocation).toHaveBeenCalledTimes(1)

    rerender(renderList({ sections: yourTokensAndTrending, chainFilter: UniverseChainId.Mainnet }))
    expect(scrollToLocation).toHaveBeenCalledTimes(1)

    rerender(renderList({ sections: undefined, loading: true, chainFilter: UniverseChainId.Base }))
    expect(scrollToLocation).toHaveBeenCalledTimes(1)

    rerender(renderList({ sections: yourTokens, chainFilter: UniverseChainId.Base }))
    expect(scrollToLocation).toHaveBeenCalledTimes(2)
    expect(scrollToLocation).toHaveBeenLastCalledWith({ itemIndex: 0, sectionIndex: 0, animated: true })
  })
})
