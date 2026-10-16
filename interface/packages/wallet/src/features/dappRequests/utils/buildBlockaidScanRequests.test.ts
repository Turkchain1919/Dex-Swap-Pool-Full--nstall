import { UniverseChainId } from '@universe/chains'
import { EthMethod } from 'uniswap/src/features/dappRequests/types'
import { buildBlockaidScanJsonRpcRequest } from 'wallet/src/features/dappRequests/utils/buildBlockaidScanJsonRpcRequest'
import { buildBlockaidScanTransactionRequest } from 'wallet/src/features/dappRequests/utils/buildBlockaidScanTransactionRequest'

const ACCOUNT = '0x1111111111111111111111111111111111111111'

describe('Blockaid scan request options', () => {
  it('requests validation and simulation for transactions', () => {
    const request = buildBlockaidScanTransactionRequest({
      chainId: UniverseChainId.Mainnet,
      account: ACCOUNT,
      transaction: {
        from: ACCOUNT,
        to: '0x2222222222222222222222222222222222222222',
        data: '0x',
        value: '0x0',
      },
      dappUrl: 'https://dapp.example',
    })

    expect(request.options).toEqual(['validation', 'simulation'])
  })

  it('requests validation and simulation for JSON-RPC execution scans', () => {
    const request = buildBlockaidScanJsonRpcRequest({
      chainId: UniverseChainId.Mainnet,
      account: ACCOUNT,
      method: EthMethod.WalletSendCalls,
      params: [],
      dappUrl: 'https://dapp.example',
    })

    expect(request.options).toEqual(['validation', 'simulation'])
  })
})
