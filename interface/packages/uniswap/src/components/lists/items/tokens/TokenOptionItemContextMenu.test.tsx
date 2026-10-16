import { render, screen } from '@testing-library/react'
import { Currency, Token } from '@uniswap/sdk-core'
import { TokenOptionItemContextMenu } from 'uniswap/src/components/lists/items/tokens/TokenOptionItemContextMenu'
import { TokenContextMenuAction } from 'uniswap/src/components/lists/items/tokens/useSearchTokenMenuItems'

// The mounted branch is what the latch defers, so make it observable and cheap.
vi.mock('uniswap/src/components/lists/items/tokens/useSearchTokenMenuItems', async (importOriginal) => ({
  ...(await importOriginal<typeof import('uniswap/src/components/lists/items/tokens/useSearchTokenMenuItems')>()),
  useSearchTokenMenuItems: () => ({ menuItems: [] }),
}))

vi.mock('uniswap/src/components/menus/ContextMenu', () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => (
    <div>
      <span>menu-mounted</span>
      {children}
    </div>
  ),
}))

// Real tokens, not stubs: the latch keys on `currencyId(currency)`, so fixtures need a distinct
// chainId/address pair or every row collapses to the same id.
const ADDRESS_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const ADDRESS_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const currencyA = new Token(1, ADDRESS_A, 18, 'AAA') as Currency
const currencyB = new Token(1, ADDRESS_B, 18, 'BBB') as Currency

function renderMenu({
  currency,
  isOpen,
  openMenu,
}: {
  currency: Currency
  isOpen: boolean
  openMenu?: () => void
}): JSX.Element {
  return (
    <TokenOptionItemContextMenu
      actions={[TokenContextMenuAction.CopyAddress]}
      currency={currency}
      isOpen={isOpen}
      openMenu={openMenu}
      closeMenu={vi.fn()}
    >
      <span>row</span>
    </TokenOptionItemContextMenu>
  )
}

const isMounted = (): boolean => screen.queryByText('menu-mounted') !== null

describe('TokenOptionItemContextMenu', () => {
  it('defers mounting the menu until the row is first opened', () => {
    const { rerender } = render(renderMenu({ currency: currencyA, isOpen: false }))
    expect(isMounted()).toBe(false)
    expect(screen.getByText('row')).toBeDefined()

    rerender(renderMenu({ currency: currencyA, isOpen: true }))
    expect(isMounted()).toBe(true)
  })

  it('keeps the menu mounted after it closes, so the close is not cut short', () => {
    const { rerender } = render(renderMenu({ currency: currencyA, isOpen: true }))
    rerender(renderMenu({ currency: currencyA, isOpen: false }))

    expect(isMounted()).toBe(true)
  })

  it('drops back to deferred when the cell is recycled into a different currency', () => {
    const { rerender } = render(renderMenu({ currency: currencyA, isOpen: true }))
    expect(isMounted()).toBe(true)

    // Same component instance, new row: under `recycleItems` this is what a scroll produces. An
    // instance-scoped latch would stay mounted here and the deferral would erode across the list.
    rerender(renderMenu({ currency: currencyB, isOpen: false }))

    expect(isMounted()).toBe(false)
  })

  it('holds the latch when the data layer hands back a new object for the same token', () => {
    const { rerender } = render(renderMenu({ currency: currencyA, isOpen: true }))
    expect(isMounted()).toBe(true)

    // A portfolio refetch rebuilds CurrencyInfo, so the Currency is a fresh object with the same id.
    // Keying on identity would drop the latch here and remount the row subtree.
    rerender(renderMenu({ currency: new Token(1, ADDRESS_A, 18, 'AAA') as Currency, isOpen: false }))

    expect(isMounted()).toBe(true)
  })

  it('mounts eagerly when the consumer relies on the menu to render its own trigger', () => {
    render(renderMenu({ currency: currencyA, isOpen: false, openMenu: vi.fn() }))

    // With `openMenu` supplied, deferring would remove the only thing that can flip `isOpen`.
    expect(isMounted()).toBe(true)
  })
})
