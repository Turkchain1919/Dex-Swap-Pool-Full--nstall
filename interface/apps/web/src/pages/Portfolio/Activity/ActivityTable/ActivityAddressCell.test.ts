import { EarnAction } from '@universe/api/src/clients/trading/__generated__/models/EarnAction'
import { UniverseChainId } from '@universe/chains'
import type { TFunction } from 'i18next'
import { TransactionDetails, TransactionType } from 'uniswap/src/features/transactions/types/transactionDetails'
import {
  getActivityAddressDisplay,
  getEarnActivityAddressDirection,
} from '~/pages/Portfolio/Activity/ActivityTable/ActivityAddressCell'
import { buildActivityRowFragments } from '~/pages/Portfolio/Activity/ActivityTable/registry'

const USER_ADDRESS = '0x0000000000000000000000000000000000000001'
const WRAP_HASH = '0x1111111111111111111111111111111111111111111111111111111111111111'

// Returns the key so assertions can target i18n keys rather than resolved copy
const identityT = ((key: string) => key) as unknown as TFunction

function createTransaction(typeInfo: TransactionDetails['typeInfo']): TransactionDetails {
  return { typeInfo } as TransactionDetails
}

describe('getEarnActivityAddressDirection', () => {
  it('uses To for vault deposits and From for vault withdrawals', () => {
    expect(
      getEarnActivityAddressDirection(
        createTransaction({
          type: TransactionType.Deposit,
          isVault: true,
        } as TransactionDetails['typeInfo']),
      ),
    ).toBe('to')

    expect(
      getEarnActivityAddressDirection(
        createTransaction({
          type: TransactionType.Withdraw,
          isVault: true,
        } as TransactionDetails['typeInfo']),
      ),
    ).toBe('from')
  })

  it('does not override non-vault activity', () => {
    expect(
      getEarnActivityAddressDirection(
        createTransaction({
          type: TransactionType.Withdraw,
        } as TransactionDetails['typeInfo']),
      ),
    ).toBeUndefined()

    expect(
      getEarnActivityAddressDirection(
        createTransaction({
          type: TransactionType.Send,
        } as TransactionDetails['typeInfo']),
      ),
    ).toBeUndefined()
  })

  it('uses To/From for Earn plan rows', () => {
    expect(
      getEarnActivityAddressDirection(
        createTransaction({
          type: TransactionType.Plan,
          earnAction: EarnAction.DEPOSIT,
        } as TransactionDetails['typeInfo']),
      ),
    ).toBe('to')

    expect(
      getEarnActivityAddressDirection(
        createTransaction({
          type: TransactionType.Plan,
          earnAction: EarnAction.WITHDRAW,
        } as TransactionDetails['typeInfo']),
      ),
    ).toBe('from')
  })
})

describe('getActivityAddressDisplay', () => {
  it('shows the transaction hash instead of protocol metadata for wraps', () => {
    const transaction = {
      id: 'wrap-with-dapp-info',
      chainId: UniverseChainId.Mainnet,
      hash: WRAP_HASH,
      from: USER_ADDRESS,
      typeInfo: {
        type: TransactionType.Wrap,
        unwrapped: false,
        currencyAmountRaw: '1000000000000000000',
        dappInfo: { name: 'Uniswap V4' },
      },
    } as TransactionDetails

    const { protocolInfo } = buildActivityRowFragments(transaction)
    // The adapter still resolves protocol metadata; the cell is what must ignore it
    expect(protocolInfo).not.toBeNull()

    const display = getActivityAddressDisplay({
      t: identityT,
      transaction,
      otherPartyAddress: USER_ADDRESS,
      protocolInfo,
    })

    expect(display.label).toBe('transaction.details.transaction')
    expect(display.content).toEqual({ type: 'transactionHash', hash: WRAP_HASH })
  })
})
