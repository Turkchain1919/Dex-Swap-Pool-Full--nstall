import { tryProvideSession } from '@universe/api'
import { ViemClientManager, Platform, areAddressesEqual } from '@universe/chains'
import { getChainInfo } from 'uniswap/src/features/chains/chainInfo'
import { createViemClientFactory } from 'uniswap/src/features/providers/createViemClient'
import { defaultResolveRpcConfig } from 'uniswap/src/features/providers/resolveRpcConfig'
const createClient = createViemClientFactory({
  resolveRpcConfig: defaultResolveRpcConfig,
  getChainInfo,
  getSessionGate: tryProvideSession,
  areAddressesEqual: (a, b) =>
    areAddressesEqual({
      addressInput1: { address: a, platform: Platform.EVM },
      addressInput2: { address: b, platform: Platform.EVM },
    }),
})

export const viemClients = new ViemClientManager(createClient)
