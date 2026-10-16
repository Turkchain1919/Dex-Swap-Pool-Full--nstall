import { SharedQueryClient } from '@universe/api'
import {
  PriceServiceProvider,
  RestPriceBatcher,
  type TokenPriceMessage,
  type TokenSubscriptionParams,
} from '@universe/prices'
import type { WebSocketClient } from '@universe/websocket'
import { type ReactElement, type ReactNode, useState } from 'react'
import { createRestPriceClient } from 'uniswap/src/features/prices/createRestPriceClient'

type RemotePriceProviderProps = {
  children: ReactNode
  /** Aurora live-price websocket client. Omitted on platforms with no live-price transport. */
  wsClient?: WebSocketClient<TokenSubscriptionParams, TokenPriceMessage['data']>
}

export function RemotePriceProvider({ children, wsClient }: RemotePriceProviderProps): ReactElement {
  const [restBatcher] = useState(() => new RestPriceBatcher(createRestPriceClient()))

  return (
    <PriceServiceProvider wsClient={wsClient} queryClient={SharedQueryClient} restBatcher={restBatcher}>
      {children}
    </PriceServiceProvider>
  )
}
