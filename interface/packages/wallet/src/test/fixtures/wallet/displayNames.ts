import { DisplayName, DisplayNameType } from 'uniswap/src/features/accounts/types'
import { createFixture } from 'uniswap/src/test/utils'

/**
 * Base fixtures
 */

export const unitagDisplayName = createFixture<DisplayName>()(() => ({
  name: 'testunitag',
  type: DisplayNameType.Unitag,
}))

export const localDisplayName = createFixture<DisplayName>()(() => ({
  name: 'Test Account',
  type: DisplayNameType.Local,
}))

/**
 * Static fixtures
 */

export const UNITAG_DISPLAY_NAME = unitagDisplayName()

export const LOCAL_DISPLAY_NAME = localDisplayName()
