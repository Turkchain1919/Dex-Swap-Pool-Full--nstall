import { ListLaunchpadsResponse } from '@uniswap/client-launches/dist/launches/v1/api_pb'
import { launchServiceClient } from 'uniswap/src/data/apiClients/dataApiService/clients/LaunchServiceClient'
import type { Mock } from 'vitest'
import { vi } from 'vitest'
import { useLaunchpads } from '~/pages/Launches/data/useLaunchpads'
import { renderHook, waitFor } from '~/test-utils/render'

// A real CIDv1: the resolver validates CID shape, so a short stub would pass through unrewritten.
const PONS_LOGO_CID = 'bafkreicr5qh6v5b2lrn7734xkx7hy7vxgho4fqffahii5xy6bob36uvss4'

vi.mock('uniswap/src/data/apiClients/dataApiService/clients/LaunchServiceClient', () => ({
  launchServiceClient: {
    listLaunches: vi.fn(),
    listLaunchpads: vi.fn(),
  },
}))

const mockListLaunchpads = launchServiceClient.listLaunchpads as Mock

describe('useLaunchpads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the launchpad registry and an id lookup map', async () => {
    mockListLaunchpads.mockResolvedValue(
      new ListLaunchpadsResponse({
        launchpads: [
          { id: 'noxa', name: 'Noxa', logoUrl: 'https://example.com/noxa.png' },
          { id: 'pump-fun', name: 'pump.fun', protocol: 'doppler' },
          { id: 'pons', name: 'Pons', logoUrl: `ipfs://${PONS_LOGO_CID}` },
        ],
      }),
    )

    const { result } = renderHook(() => useLaunchpads())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.launchpads).toHaveLength(3)
    expect(result.current.launchpadById.get('noxa')?.name).toBe('Noxa')
    expect(result.current.launchpadById.get('pump-fun')?.protocol).toBe('doppler')
    // https logos pass through; ipfs:// logos resolve to an embeddable gateway url.
    expect(result.current.launchpadById.get('noxa')?.logoUrl).toBe('https://example.com/noxa.png')
    expect(result.current.launchpadById.get('pons')?.logoUrl).toBe(`https://ipfs.pools.xyz/ipfs/${PONS_LOGO_CID}`)
    expect(result.current.isError).toBe(false)
  })
})
