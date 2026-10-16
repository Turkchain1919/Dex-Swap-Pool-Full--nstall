import { cloneElement, type ReactElement, type ReactNode } from 'react'
import { TokenOptionItemStats } from 'uniswap/src/components/lists/items/tokens/TokenOptionItem/TokenOptionItemStats'
import { render } from 'uniswap/src/test/test-utils'

// The global `Trans` mock renders only children; this one also renders the key and the interpolated price node.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Trans: ({
    i18nKey,
    values,
    components,
  }: {
    i18nKey: string
    values: { price: string }
    components: { price: ReactElement }
  }): ReactNode => (
    <>
      {i18nKey}
      {cloneElement(components.price, undefined, values.price)}
    </>
  ),
}))

describe('TokenOptionItemStats', () => {
  it('renders the plain price by default', () => {
    const { getByText, queryByText } = render(<TokenOptionItemStats priceUsd={248.42} />)
    expect(getByText('$248.42')).toBeTruthy()
    expect(queryByText('search.results.stats.fromPrice')).toBeNull()
  })

  it('renders a price floor through the translatable "from <price>" string', () => {
    const { getByText } = render(<TokenOptionItemStats priceUsd={248.42} isPriceFloor />)
    expect(getByText('search.results.stats.fromPrice')).toBeTruthy()
    expect(getByText('$248.42')).toBeTruthy()
  })
})
