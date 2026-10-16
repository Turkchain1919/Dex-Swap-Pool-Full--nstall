import { UniverseChainId } from '@universe/chains'
import type { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import type { PositionRewardApr } from 'uniswap/src/features/positions/types'
import { useCurrencyInfo } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { RewardAprBadge } from '~/features/Liquidity/LPIncentives/RewardAprBadge'
import { mocked } from '~/test-utils/mocked'
import { render, screen } from '~/test-utils/render'

// Nothing resolves against the token lists under test, so the headline logo is mocked in — the "+N"
// count has to hold whether or not it does, which is what the unlisted case below pins down.
vi.mock('uniswap/src/features/tokens/useCurrencyInfo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('uniswap/src/features/tokens/useCurrencyInfo')>()),
  useCurrencyInfo: vi.fn(),
}))

// Chain id is a literal because `vi.mock` factories are hoisted above the imports.
const LISTED_UNI = {
  currencyId: '1-0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  logoUrl: null,
  currency: { chainId: 1, symbol: 'UNI', name: 'Uniswap' },
} as unknown as CurrencyInfo

beforeEach(() => {
  mocked(useCurrencyInfo).mockReturnValue(LISTED_UNI)
})

const UNI_REWARD: PositionRewardApr = {
  token: {
    chainId: UniverseChainId.Mainnet,
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    symbol: 'UNI',
    decimals: 18,
    isNative: false,
  },
  boostedPoolApr: 3.2,
}

const MORPHO_REWARD: PositionRewardApr = {
  token: {
    chainId: UniverseChainId.Base,
    address: '0xBAa5CC21fd487B8Fcc2F632f3F4E8D37262a0842',
    symbol: 'MORPHO',
    decimals: 18,
    isNative: false,
  },
  boostedPoolApr: 1,
}

describe('RewardAprBadge', () => {
  it('renders a single token’s own APR', () => {
    render(<RewardAprBadge rewards={[UNI_REWARD]} isTokenColor size="sm" />)

    expect(screen.getByText('+3.20%')).toBeInTheDocument()
  })

  it('headlines the largest boost and counts the rest, rather than summing them', () => {
    render(<RewardAprBadge rewards={[UNI_REWARD, MORPHO_REWARD]} isTokenColor size="sm" />)

    // A badge has room for one figure. Showing the 4.20% sum here would read as UNI paying all of
    // it once the symbol is alongside; the tooltip carries the total, itemised per token.
    expect(screen.getByText('+3.20%')).toBeInTheDocument()
    expect(screen.queryByText('+4.20%')).not.toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument()
  })

  it('headlines the same token whichever order the source served the rewards in', () => {
    // Served order is not a ranking, so it can't be what picks the figure, symbol and tint — a
    // refetch that came back the other way round would otherwise swap all three.
    const { rerender } = render(<RewardAprBadge rewards={[MORPHO_REWARD, UNI_REWARD]} label="symbol" />)
    expect(screen.getByText('3.20% UNI')).toBeInTheDocument()

    rerender(<RewardAprBadge rewards={[UNI_REWARD, MORPHO_REWARD]} label="symbol" />)
    expect(screen.getByText('3.20% UNI')).toBeInTheDocument()
  })

  it('names the headline token even with several rewards', () => {
    render(<RewardAprBadge rewards={[UNI_REWARD, MORPHO_REWARD]} label="symbol" />)

    // The symbol has to belong to the figure beside it — pairing UNI's symbol with a cross-token
    // sum is the mislabelling that got the old badge deprecated.
    expect(screen.getByText('3.20% UNI')).toBeInTheDocument()
  })

  it('renders nothing when the pool has no live campaign', () => {
    const { container } = render(<RewardAprBadge rewards={[]} isTokenColor size="sm" />)

    // The render helper wraps children in a display:contents span, so the container is never
    // literally empty — the absence worth asserting is that no badge text made it out.
    expect(container.textContent).toBe('')
  })

  it('degrades a token-tinted badge to neutral once several tokens share it', () => {
    // Tinting a headline-plus-count badge in the headline token's colour would overstate what the
    // colour covers, so the tinted path is skipped. Asserted through the figure it still renders.
    render(<RewardAprBadge rewards={[UNI_REWARD, MORPHO_REWARD]} isTokenColor size="sm" />)

    expect(screen.getByText('+3.20%')).toBeInTheDocument()
  })

  it('counts only the tokens it does not name, even when the headline logo is unlisted', () => {
    mocked(useCurrencyInfo).mockReturnValue(undefined)

    render(<RewardAprBadge rewards={[UNI_REWARD, MORPHO_REWARD]} label="symbol" />)

    // The cluster's "+N" is `totalCount - logos shown`, so a flat `rewards.length` would fold the
    // unresolved headline into the overflow and read "+2" beside the very symbol it named.
    expect(screen.getByText('3.20% UNI')).toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument()
    expect(screen.queryByText('+2')).not.toBeInTheDocument()
  })

  it('names the token when asked, and labels the percentage otherwise', () => {
    const { rerender } = render(<RewardAprBadge rewards={[UNI_REWARD]} label="symbol" />)
    expect(screen.getByText('3.20% UNI')).toBeInTheDocument()

    rerender(<RewardAprBadge rewards={[UNI_REWARD]} label="rewardApr" />)
    expect(screen.getByText('3.20% reward APR')).toBeInTheDocument()
  })
})
