import i18n from 'uniswap/src/i18n'

export enum PoolTableTransactionType {
  BUY = 'Buy',
  SELL = 'Sell',
  REMOVE = 'Remove',
  ADD = 'Add',
}

export const getPoolTableTransactionTypeTranslation = (type: PoolTableTransactionType): string => {
  switch (type) {
    case PoolTableTransactionType.BUY:
      return i18n.t('common.buy.label')
    case PoolTableTransactionType.SELL:
      return i18n.t('common.sell.label')
    case PoolTableTransactionType.REMOVE:
      return i18n.t('common.remove.label')
    case PoolTableTransactionType.ADD:
      return i18n.t('common.add.label')
    default:
      return ''
  }
}

export interface PoolTableTransaction {
  timestamp: number
  transaction: string
  pool: {
    token0: {
      id: string | null
      symbol: string
    }
    token1: {
      id: string | null
      symbol: string
    }
  }
  maker: string
  amount0: number
  amount1: number
  amountUSD: number
  type: PoolTableTransactionType
}
