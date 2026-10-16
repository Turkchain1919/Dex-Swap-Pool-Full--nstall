import { LiquidityService } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v1/api_connect'
import { CHAIN_TO_ADDRESSES_MAP } from '@uniswap/sdk-core'
import { UniverseChainId } from '@universe/chains'
import { erc721Abi } from 'viem'
import { mainnet } from 'viem/chains'
import { assume0xAddress } from '~/chains'
import { createExpectSingleTransaction } from '~/playwright/anvil/transactions'
import { expect, getTest } from '~/playwright/fixtures'
import type { AnvilClient } from '~/playwright/fixtures/anvil'
import { stubGetPositionFields, stubLiquidityServiceEndpoint } from '~/playwright/fixtures/liquidityService'
import { TEST_WALLET_ADDRESS } from '~/playwright/fixtures/wallets'

const test = getTest({ withAnvil: true })

const ANIMATION_DELAY = 300

const V3_POSITION_MANAGER = CHAIN_TO_ADDRESSES_MAP[UniverseChainId.Mainnet].nonfungiblePositionManagerAddress!

// Live mainnet V3 positions used as migration sources. The migrate service reads the position from
// live mainnet, so these must be real positions with liquidity — the flow can't run against a
// closed position (it fails client-side with "Invariant failed: ZERO_LIQUIDITY"). Refresh these
// ids if they are ever fully withdrawn on mainnet (the pinned fork does not shield against it,
// because the service reads live, not the fork). Prefer deep-out-of-range / actively-managed
// positions, which are far less likely to be withdrawn than shallow ones.
// - in-range: WETH/USDT 0.3%, an actively-managed position around spot.
// - single-sided: USDC/WETH 0.05%, ~6.5k ticks above spot (all USDC) — a long-standing range order
//   that stays out of range unless ETH ~90%s, and whose single token (USDC) is Permit2-approved
//   in the committed state fixture, so the migrate settles in one tx.
const IN_RANGE_V3_TOKEN_ID = 1362704n
const SINGLE_SIDED_V3_TOKEN_ID = 402753n

/** Transfer a live mainnet V3 position NFT to the test wallet so the migrate executes on the fork. */
async function transferV3PositionToTestWallet({
  anvil,
  tokenId,
}: {
  anvil: AnvilClient
  tokenId: bigint
}): Promise<void> {
  const positionManager = assume0xAddress(V3_POSITION_MANAGER)
  const realOwner = await anvil.readContract({
    address: positionManager,
    abi: erc721Abi,
    functionName: 'ownerOf',
    args: [tokenId],
  })
  await anvil.impersonateAccount({ address: realOwner })
  await anvil.writeContract({
    address: positionManager,
    abi: erc721Abi,
    functionName: 'transferFrom',
    args: [realOwner, TEST_WALLET_ADDRESS, tokenId],
    account: realOwner,
    chain: mainnet,
  })
  // Impersonation is node config that survives evm_revert; stop it so it can't leak into later tests.
  await anvil.stopImpersonatingAccount({ address: realOwner })
}

test.describe(
  'Migrate V3',
  {
    tag: '@team:apps-lp',
    annotation: [
      { type: 'DD_TAGS[team]', description: 'apps-lp' },
      { type: 'DD_TAGS[test.type]', description: 'web-e2e' },
    ],
  },
  () => {
    test('should migrate from v3 to v4', async ({ page, anvil }) => {
      const expectSingleTransaction = createExpectSingleTransaction({
        anvil,
        address: TEST_WALLET_ADDRESS,
        options: { blocks: 2 },
      })

      // Transfer the source position to the test wallet so the migrate executes on-chain, and
      // override its owner on the read so the Migrate page's owner check passes (the live read
      // returns the real mainnet owner, which otherwise redirects to /positions).
      await transferV3PositionToTestWallet({ anvil, tokenId: IN_RANGE_V3_TOKEN_ID })
      await stubGetPositionFields({ page })
      await stubLiquidityServiceEndpoint({
        page,
        endpoint: LiquidityService.methods.migrateV3ToV4LPPosition,
      })
      await page.goto(`/migrate/v3/ethereum/${IN_RANGE_V3_TOKEN_ID}`)

      // Hold the migrate tx in the mempool so the pending "Migrating liquidity" state is observable;
      // expectSingleTransaction mines it explicitly (anvil auto-mines otherwise and it confirms instantly).
      await anvil.setAutomine(false)

      await expectSingleTransaction(async () => {
        await page.getByRole('button', { name: 'Continue' }).click()
        await page.waitForTimeout(ANIMATION_DELAY)
        await page.getByRole('button', { name: 'Continue' }).click()
        await page.getByRole('button', { name: 'Migrate' }).click()
        await expect(page.getByText('Migrating liquidity')).toBeVisible()
      })
    })

    test('should migrate a single sided position from v3 to v4', async ({ page, anvil }) => {
      const expectSingleTransaction = createExpectSingleTransaction({
        anvil,
        address: TEST_WALLET_ADDRESS,
        options: { blocks: 2 },
      })

      await transferV3PositionToTestWallet({ anvil, tokenId: SINGLE_SIDED_V3_TOKEN_ID })
      await stubGetPositionFields({ page })
      await stubLiquidityServiceEndpoint({
        page,
        endpoint: LiquidityService.methods.migrateV3ToV4LPPosition,
      })
      await page.goto(`/migrate/v3/ethereum/${SINGLE_SIDED_V3_TOKEN_ID}`)

      await anvil.setAutomine(false)

      await expectSingleTransaction(async () => {
        await page.getByRole('button', { name: 'Continue' }).click()
        await page.waitForTimeout(ANIMATION_DELAY)
        await page.getByRole('button', { name: 'Continue' }).click()
        await page.getByRole('button', { name: 'Migrate' }).click()
        await expect(page.getByText('Migrating liquidity')).toBeVisible()
      })
    })
  },
)
