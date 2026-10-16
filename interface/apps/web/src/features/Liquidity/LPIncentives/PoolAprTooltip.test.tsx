import { UniverseChainId } from '@universe/chains'
import type { PositionRewardApr } from 'uniswap/src/features/positions/types'
import { useCurrencyInfo } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { ETH_CURRENCY_INFO } from 'uniswap/src/test/fixtures/wallet/currencies'
import { PoolAprTooltip } from '~/features/Liquidity/LPIncentives/PoolAprTooltip'
import { mocked } from '~/test-utils/mocked'
import { render, screen } from '~/test-utils/render'

vi.mock('uniswap/src/features/tokens/useCurrencyInfo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('uniswap/src/features/tokens/useCurrencyInfo')>()),
  useCurrencyInfo: vi.fn(),
}))

function reward(overrides?: Partial<PositionRewardApr>): PositionRewardApr {
  return {
    token: {
      chainId: UniverseChainId.Mainnet,
      address: '0xe343167631d89B6Ffc58B88d6b7fB0228795491D',
      symbol: 'USDG',
      decimals: 18,
      isNative: false,
    },
    boostedPoolApr: 6.93,
    ...overrides,
  }
}

describe('PoolAprTooltip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // The default for these fixture addresses, so the rows fall back to the served symbol.
    mocked(useCurrencyInfo).mockReturnValue(undefined)
  })

  it('names each reward row from its own token rather than a hardcoded denomination', () => {
    render(<PoolAprTooltip currency0Info={undefined} currency1Info={undefined} poolApr={11.53} rewards={[reward()]} />)

    expect(screen.getByText('USDG Reward APR')).toBeInTheDocument()
    expect(screen.queryByText(/UNI/)).not.toBeInTheDocument()
    expect(screen.getByText('6.93%')).toBeInTheDocument()
  })

  it('renders the windowed 24H/7D/30D breakdown when day-data is present', () => {
    render(
      <PoolAprTooltip
        currency0Info={undefined}
        currency1Info={undefined}
        poolApr={12.53}
        apr1d={12.53}
        apr7d={9.21}
        apr30d={7.77}
      />,
    )

    expect(screen.getByText('24H average')).toBeInTheDocument()
    expect(screen.getByText('7D average')).toBeInTheDocument()
    expect(screen.getByText('30D average')).toBeInTheDocument()
    expect(screen.getByText('12.53%')).toBeInTheDocument()
    expect(screen.getByText('9.21%')).toBeInTheDocument()
    expect(screen.getByText('7.77%')).toBeInTheDocument()
    // No fee campaign, so the total row (fee + reward) is meaningless and stays hidden.
    expect(screen.queryByText(/Total/)).not.toBeInTheDocument()
    // Day-data supersedes the Pool APR fallback row.
    expect(screen.queryByText('Pool APR')).not.toBeInTheDocument()
  })

  it('labels the total "Total 24H APR" on windowed surfaces, and it reconciles with the 24H + reward rows', () => {
    render(
      <PoolAprTooltip
        currency0Info={undefined}
        currency1Info={undefined}
        poolApr={12.53}
        apr1d={12.53}
        apr7d={9.21}
        apr30d={7.77}
        rewards={[reward({ boostedPoolApr: 4.44 })]}
        totalApr={16.97}
      />,
    )

    // 24H fee (12.53) + reward (4.44) = served total (16.97).
    expect(screen.getByText('Total 24H APR')).toBeInTheDocument()
    expect(screen.getByText('12.53%')).toBeInTheDocument()
    expect(screen.getByText('4.44%')).toBeInTheDocument()
    expect(screen.getByText('16.97%')).toBeInTheDocument()
  })

  it('shows the Pool APR row and a generic "Total APR" label when there is no day-data', () => {
    render(
      <PoolAprTooltip
        currency0Info={undefined}
        currency1Info={undefined}
        poolApr={11.53}
        rewards={[reward({ boostedPoolApr: 6.93 })]}
        totalApr={18.46}
      />,
    )

    expect(screen.getByText('Pool APR')).toBeInTheDocument()
    expect(screen.getByText('Total APR')).toBeInTheDocument()
    expect(screen.queryByText('Total 24H APR')).not.toBeInTheDocument()
    expect(screen.getByText('11.53%')).toBeInTheDocument()
    expect(screen.getByText('18.46%')).toBeInTheDocument()
    // No day-data, so the windowed rows never render.
    expect(screen.queryByText('24H average')).not.toBeInTheDocument()
  })

  it('keeps the total generic and shows the fee row when only the 7D/30D windows are served', () => {
    render(
      <PoolAprTooltip
        currency0Info={undefined}
        currency1Info={undefined}
        poolApr={11.53}
        apr7d={9.21}
        apr30d={7.77}
        rewards={[reward({ boostedPoolApr: 6.93 })]}
        totalApr={18.46}
      />,
    )

    // Without a 24H row to back it, the total can't claim to be a 24H number...
    expect(screen.getByText('Total APR')).toBeInTheDocument()
    expect(screen.queryByText('Total 24H APR')).not.toBeInTheDocument()
    // ...and the Pool APR row stands in for it, so the total's fee half stays visible.
    expect(screen.getByText('Pool APR')).toBeInTheDocument()
    expect(screen.getByText('11.53%')).toBeInTheDocument()
  })

  it('renders one row per reward token', () => {
    render(
      <PoolAprTooltip
        currency0Info={undefined}
        currency1Info={undefined}
        poolApr={10}
        apr1d={10}
        rewards={[
          reward({ token: { ...reward().token, symbol: 'USDG' }, boostedPoolApr: 4.44 }),
          reward({
            token: {
              chainId: UniverseChainId.Mainnet,
              address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
              symbol: 'UNI',
              decimals: 18,
              isNative: false,
            },
            boostedPoolApr: 2.22,
          }),
        ]}
        totalApr={16.66}
      />,
    )

    expect(screen.getByText('USDG Reward APR')).toBeInTheDocument()
    expect(screen.getByText('UNI Reward APR')).toBeInTheDocument()
    expect(screen.getByText('4.44%')).toBeInTheDocument()
    expect(screen.getByText('2.22%')).toBeInTheDocument()
    expect(screen.getByText('16.66%')).toBeInTheDocument()
  })

  // The total is the backend's `total_apr`, not a client-side sum of the rows above it: recomposing
  // it here would let the tooltip disagree with the APR the rest of the app shows for the same pool.
  it('shows the placeholder rather than summing the rows when the total is unserved', () => {
    render(
      <PoolAprTooltip
        currency0Info={undefined}
        currency1Info={undefined}
        poolApr={11.53}
        rewards={[reward({ token: { ...reward().token, symbol: 'USDG' }, boostedPoolApr: 6.93 })]}
      />,
    )

    expect(screen.getByText('Total APR')).toBeInTheDocument()
    expect(screen.queryByText('18.46%')).not.toBeInTheDocument()
  })

  // Now that a native reward token resolves a real currencyInfo, the listed symbol is the better
  // name — and the same precedence LpIncentivesRewardsModal uses, so one served payload can't name
  // the same token two different things across the two surfaces.
  it('prefers the listed symbol over the served one', () => {
    mocked(useCurrencyInfo).mockReturnValue(ETH_CURRENCY_INFO)

    render(
      <PoolAprTooltip
        currency0Info={undefined}
        currency1Info={undefined}
        poolApr={11.53}
        rewards={[reward({ token: { ...reward().token, symbol: 'WETH' } })]}
      />,
    )

    expect(screen.getByText('ETH Reward APR')).toBeInTheDocument()
    expect(screen.queryByText('WETH Reward APR')).not.toBeInTheDocument()
  })

  // `token.symbol` is a protobuf string field, so a token the backend couldn't name arrives as ''.
  // A `??` fallback keeps that empty string and strands the row on a bare "Reward APR".
  it('names a row the backend left unnamed from the token list', () => {
    mocked(useCurrencyInfo).mockReturnValue(ETH_CURRENCY_INFO)

    render(
      <PoolAprTooltip
        currency0Info={undefined}
        currency1Info={undefined}
        poolApr={11.53}
        rewards={[reward({ token: { ...reward().token, symbol: '' } })]}
      />,
    )

    expect(screen.getByText('ETH Reward APR')).toBeInTheDocument()
  })
})
