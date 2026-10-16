import { UniverseChainId } from '@universe/chains'
import { DappState, dappStore } from 'src/app/features/dapp/store'
import {
  connectImpersonatedAccountToDapps,
  restoreDappsFromImpersonatedAccounts,
} from 'src/app/features/settings/devImpersonation'
import { SAMPLE_SEED_ADDRESS_1 } from 'uniswap/src/test/fixtures'
import { ACCOUNT, readOnlyAccount } from 'wallet/src/test/fixtures'

const SAMPLE_DAPP = 'http://example.com'
const IMPERSONATED = readOnlyAccount({ address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' })

const dappState: DappState = {
  [SAMPLE_DAPP]: {
    lastChainId: UniverseChainId.Mainnet,
    connectedAccounts: [ACCOUNT],
    activeConnectedAddress: SAMPLE_SEED_ADDRESS_1,
  },
}

vi.mock('src/background/messagePassing/messageChannels', () => ({
  externalDappMessageChannel: { sendMessageToTabUrl: vi.fn(() => Promise.resolve()) },
}))

vi.mock('src/app/features/dapp/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/app/features/dapp/utils')>()),
  getCapitalizedDisplayNameFromTab: vi.fn(() => Promise.resolve(undefined)),
}))

Object.defineProperty(global, 'chrome', {
  value: {
    runtime: { lastError: undefined },
    storage: {
      local: {
        get: vi.fn(() => Promise.resolve({ dappState })),
        set: vi.fn(),
        onChanged: { addListener: vi.fn() },
      },
    },
  },
})

describe('impersonation dapp connections', () => {
  beforeAll(async () => {
    await dappStore.init()
  })

  it('hands connected dapps to the impersonated account and back again', async () => {
    await connectImpersonatedAccountToDapps({ account: IMPERSONATED, previousAddress: ACCOUNT.address })

    const impersonated = dappStore.getDappInfo(SAMPLE_DAPP)
    expect(impersonated?.activeConnectedAddress).toBe(IMPERSONATED.address)
    // The real wallet is kept alongside rather than replaced, which is what makes the restore below work.
    expect(impersonated?.connectedAccounts.map((account) => account.address)).toEqual([
      ACCOUNT.address,
      IMPERSONATED.address,
    ])

    await restoreDappsFromImpersonatedAccounts({ accounts: [IMPERSONATED], restoreAddress: ACCOUNT.address })

    const restored = dappStore.getDappInfo(SAMPLE_DAPP)
    expect(restored?.activeConnectedAddress).toBe(ACCOUNT.address)
    expect(restored?.connectedAccounts.map((account) => account.address)).toEqual([ACCOUNT.address])
  })
})
