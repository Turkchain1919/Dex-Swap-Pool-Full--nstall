import { UniverseChainId } from '@universe/chains'
import type { EthTransaction } from 'uniswap/src/types/walletConnect'
import { buildBlockaidScanTransactionRequest } from 'wallet/src/features/dappRequests/utils/buildBlockaidScanTransactionRequest'

const ACCOUNT = '0x1111111111111111111111111111111111111111'
const DAPP_SUPPLIED_FROM = '0x2222222222222222222222222222222222222222'

describe('buildBlockaidScanTransactionRequest', () => {
  it('builds the same scan request for the control and byte-array bypass values', () => {
    const request = {
      chainId: UniverseChainId.Mainnet,
      account: ACCOUNT,
      dappUrl: 'https://dapp.example',
    }
    const control = buildBlockaidScanTransactionRequest({ transaction: { value: '0x0' }, ...request })
    const bypass = buildBlockaidScanTransactionRequest({
      transaction: { value: [0] } as unknown as EthTransaction,
      ...request,
    })

    expect(bypass).toEqual(control)
    expect(bypass.data.value).toBe('0x00')
  })

  it('canonicalizes execution fields and omits gas fields and nonce assigned by the wallet', () => {
    const transaction = {
      from: DAPP_SUPPLIED_FROM,
      to: '0x3333333333333333333333333333333333333333',
      value: [0],
      gasLimit: [0x52, 0x08],
      gasPrice: [1],
      maxPriorityFeePerGas: [2],
      maxFeePerGas: [3],
      nonce: [4],
      data: '0x',
    } as unknown as EthTransaction

    const result = buildBlockaidScanTransactionRequest({
      transaction,
      chainId: UniverseChainId.Mainnet,
      account: ACCOUNT,
      dappUrl: 'https://dapp.example',
    })

    expect(result.account_address).toBe(ACCOUNT)
    expect(result.data).toStrictEqual({
      from: ACCOUNT,
      to: transaction.to,
      value: '0x00',
      data: '0x',
    })

    expect(result).toEqual(
      buildBlockaidScanTransactionRequest({
        transaction: {
          to: transaction.to,
          value: transaction.value,
          data: transaction.data,
        } as unknown as EthTransaction,
        chainId: UniverseChainId.Mainnet,
        account: ACCOUNT,
        dappUrl: 'https://dapp.example',
      }),
    )
  })
})
