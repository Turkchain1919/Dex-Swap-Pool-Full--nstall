import { UniverseChainId } from '@universe/chains'
import { getChainInfo } from 'uniswap/src/features/chains/chainInfo'
import { HeaderNetworkPill } from '~/components/StickyCollapsibleHeader/HeaderNetworkPill'
import { render, screen } from '~/test-utils/render'

describe('HeaderNetworkPill', () => {
  it('names the network it is given', () => {
    render(<HeaderNetworkPill chainId={UniverseChainId.Optimism} />)

    expect(screen.getByText(getChainInfo(UniverseChainId.Optimism).label)).toBeInTheDocument()
  })

  // The whole point of this component over TokenDetailsNetworkFilter: on a single-chain surface there is
  // nothing to switch to, so it must not present a control that looks pressable and no-ops.
  it('is display-only, with nothing pressable', () => {
    render(<HeaderNetworkPill chainId={UniverseChainId.Mainnet} />)

    expect(screen.getByText(getChainInfo(UniverseChainId.Mainnet).label)).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
