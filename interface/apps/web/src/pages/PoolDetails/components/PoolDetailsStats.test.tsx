import '~/test-utils/tokens/mocks'
import { enableNetConnect } from 'nock'
import { USDC_MAINNET } from 'uniswap/src/constants/tokens'
import { dismissTokenWarning } from 'uniswap/src/features/tokens/warnings/slice/slice'
import { TokenProtectionWarning } from 'uniswap/src/features/tokens/warnings/types'
import { toRewardAprEntries } from '~/features/Liquidity/LPIncentives/utils'
import { PoolDetailsStats } from '~/pages/PoolDetails/components/PoolDetailsStats'
import store from '~/state'
import { mockMediaSize } from '~/test-utils/mockMediaSize'
import { validPoolDataResponse } from '~/test-utils/pools/fixtures'
import { act, render, screen } from '~/test-utils/render'

vi.mock('@universe/mycelium/theme-hooks-compat', async () => {
  const actual = await vi.importActual('@universe/mycelium/theme-hooks-compat')
  return {
    ...actual,
    useMedia: vi.fn(),
  }
})

describe('PoolDetailsStats', () => {
  // USDC on mainnet stands in for the served reward token: one of the few whose CurrencyInfo — which
  // the badge's logo needs — resolves offline under test.
  const servedRewards = toRewardAprEntries(4.5, USDC_MAINNET)

  const mockProps = {
    poolData: validPoolDataResponse.data,
    isReversed: false,
    chainId: 1,
    tokenAColor: '#FF37C7',
    tokenBColor: '#222222',
  }

  beforeEach(() => {
    // Enable network connections for retrieving token logos
    enableNetConnect()
    store.dispatch(
      dismissTokenWarning({
        token: {
          chainId: 1,
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
        },
        warning: TokenProtectionWarning.NonDefault,
      }),
    )
    store.dispatch(
      dismissTokenWarning({
        token: {
          chainId: 1,
          address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          symbol: 'WETH',
          name: 'Wrapped Ether',
          decimals: 18,
        },
        warning: TokenProtectionWarning.NonDefault,
      }),
    )
  })

  it('renders stats text correctly', async () => {
    mockMediaSize('xxl')

    const { asFragment } = render(<PoolDetailsStats {...mockProps} />)
    // After the first render, the extracted color is updated to an a11y compliant color
    // This is why we need to wrap the fragment in act(...)
    await act(async () => {
      await asFragment
    })
    expect(asFragment()).toMatchSnapshot()

    expect(screen.getByText(/Stats/i)).toBeInTheDocument()
    expect(screen.getByText('90.9M')).toBeInTheDocument()
    expect(screen.getByText('USDC')).toBeInTheDocument()
    expect(screen.getByText('82.5K')).toBeInTheDocument()
    expect(screen.getByText('ETH')).toBeInTheDocument()
    expect(screen.getByText(/TVL/i)).toBeInTheDocument()
    expect(screen.getByText('$223.2M')).toBeInTheDocument()
    expect(screen.getByTestId('pool-balance-chart')).toBeInTheDocument()
  })

  it('renders $0 with its delta when 24h volume is a served zero', async () => {
    mockMediaSize('xxl')

    const props = {
      ...mockProps,
      poolData: { ...mockProps.poolData, volumeUSD24H: 0, volumeUSD24HChange: -100 },
    }
    const { asFragment } = render(<PoolDetailsStats {...props} />)
    await act(async () => {
      await asFragment
    })

    // A served zero is data, not a gap: volume and fees show $0 (not '-') and the -100% renders
    expect(screen.getAllByText('$0')).toHaveLength(2)
    expect(screen.queryByText('-')).toBeNull()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('names the served reward token in the reward row', () => {
    mockMediaSize('xxl')

    render(<PoolDetailsStats {...mockProps} poolApr={6} rewards={servedRewards} />)

    expect(screen.getByText('Reward APR')).toBeInTheDocument()
    expect(screen.getByText('4.50% USDC')).toBeInTheDocument()
  })

  // The breakdown is a label beside nothing without a token to denominate the boost in, while the
  // total above it still counts the boost — so it stays off entirely rather than half-rendered.
  it('hides the reward row when no reward token is served', () => {
    mockMediaSize('xxl')

    render(<PoolDetailsStats {...mockProps} poolApr={6} rewards={[]} />)

    expect(screen.queryByText('Reward APR')).toBeNull()
  })

  // `total_apr` is served with every boost already summed in, so the headline takes the passed prop
  // rather than reaching into `poolData` — the two can disagree, and the breakdown below accounts
  // for the prop's figure, not the pool data's.
  it('shows the passed total APR, not the boosted one on the pool data', () => {
    mockMediaSize('xxl')

    const poolData = { ...mockProps.poolData, apr: 6, totalApr: 10.5 }

    // Unboosted: the fee APR is the total, and no breakdown renders.
    const { unmount } = render(<PoolDetailsStats {...mockProps} poolData={poolData} poolApr={6} totalApr={6} />)
    expect(screen.getByText('6%')).toBeInTheDocument()
    expect(screen.queryByText('10.50%')).toBeNull()
    expect(screen.queryByText('Reward APR')).toBeNull()
    unmount()

    // Boosted: the served total and its breakdown both render.
    render(<PoolDetailsStats {...mockProps} poolData={poolData} poolApr={6} rewards={servedRewards} totalApr={10.5} />)
    expect(screen.getByText('10.50%')).toBeInTheDocument()
    expect(screen.getByText('Reward APR')).toBeInTheDocument()
  })

  it('pool balance chart not visible on mobile', async () => {
    mockMediaSize('xl')
    const { asFragment } = render(<PoolDetailsStats {...mockProps} />)
    await act(async () => {
      await asFragment
    })
    expect(asFragment()).toMatchSnapshot()

    expect(screen.queryByTestId('pool-balance-chart')).toBeNull()
  })
})
