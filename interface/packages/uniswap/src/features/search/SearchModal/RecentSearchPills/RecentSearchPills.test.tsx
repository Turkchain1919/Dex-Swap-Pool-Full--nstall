import { fireEvent } from '@testing-library/react'
import { Token } from '@uniswap/sdk-core'
import { UniverseChainId } from '@universe/chains'
import {
  OnchainItemListOptionType,
  SearchModalListOption,
  SearchModalOption,
  TokenOption,
  WalletByAddressOption,
} from 'uniswap/src/components/lists/items/types'
import { OnchainItemSection, OnchainItemSectionName } from 'uniswap/src/components/lists/OnchainItemList/types'
import { DisplayNameType } from 'uniswap/src/features/accounts/types'
import { buildCurrencyInfo } from 'uniswap/src/features/dataApi/utils/buildCurrency'
import { RECENT_SEARCH_PILLS_MAX_COUNT } from 'uniswap/src/features/search/SearchModal/constants'
import { RecentSearchPills } from 'uniswap/src/features/search/SearchModal/RecentSearchPills/RecentSearchPills'
import { benignSafetyInfo } from 'uniswap/src/test/fixtures/wallet/currencies'
import { render } from 'uniswap/src/test/test-utils'
import { currencyId } from 'uniswap/src/utils/currencyId'

const WALLET_ADDRESS = '0x1111111111111111111111111111111111111111'
const WALLET_NAME = 'vitalik.eth'

// Wallet pills resolve their label like the vertical wallet row; stub the lookup so the test needs no ENS/Unitag data.
vi.mock('uniswap/src/features/accounts/useOnchainDisplayName', () => ({
  useOnchainDisplayName: vi.fn(() => ({ name: WALLET_NAME, type: DisplayNameType.ENS })),
}))

function tokenOption(index: number): TokenOption {
  const address = `0x${(index + 1).toString(16).padStart(40, '0')}`
  const currency = new Token(UniverseChainId.Mainnet, address, 18, `TK${index}`, `Token ${index}`)
  return {
    type: OnchainItemListOptionType.Token,
    currencyInfo: buildCurrencyInfo({
      currencyId: currencyId(currency),
      currency,
      logoUrl: null,
      safetyInfo: benignSafetyInfo,
    }),
    quantity: null,
    balanceUSD: undefined,
  }
}

const walletOption: WalletByAddressOption = { type: OnchainItemListOptionType.WalletByAddress, address: WALLET_ADDRESS }

function sectionFor(options: SearchModalOption[]): OnchainItemSection<SearchModalListOption> {
  return { sectionKey: OnchainItemSectionName.RecentSearches, data: [options] }
}

describe(RecentSearchPills, () => {
  it('renders one pill per option and reports the pressed pill with its list position', () => {
    const options = [tokenOption(0), tokenOption(1), walletOption]
    const section = sectionFor(options)
    const onSelectOption = vi.fn()

    // Pills are queried by their accessible name: the token logo fallback also prints the symbol as text.
    const { getByRole } = render(
      <RecentSearchPills options={options} rowIndex={1} section={section} onSelectOption={onSelectOption} />,
    )

    expect(getByRole('button', { name: 'TK0' })).toBeDefined()
    expect(getByRole('button', { name: WALLET_NAME })).toBeDefined()

    fireEvent.click(getByRole('button', { name: 'TK1' }) as unknown as Element)
    expect(onSelectOption).toHaveBeenCalledWith({ item: options[1], section, index: 1, rowIndex: 1 })
  })

  it('caps the row at the pill limit', () => {
    const options = Array.from({ length: RECENT_SEARCH_PILLS_MAX_COUNT + 1 }, (_, i) => tokenOption(i))

    const { getAllByRole, queryByRole } = render(
      <RecentSearchPills options={options} rowIndex={1} section={sectionFor(options)} onSelectOption={vi.fn()} />,
    )

    expect(getAllByRole('button')).toHaveLength(RECENT_SEARCH_PILLS_MAX_COUNT)
    expect(queryByRole('button', { name: `TK${RECENT_SEARCH_PILLS_MAX_COUNT}` })).toBeNull()
  })

  it('renders nothing for an empty row', () => {
    const { queryByRole } = render(
      <RecentSearchPills options={[]} rowIndex={1} section={sectionFor([])} onSelectOption={vi.fn()} />,
    )
    expect(queryByRole('button')).toBeNull()
  })
})
