import type { PortfolioBalanceRefreshButtonProps } from 'uniswap/src/features/portfolio/PortfolioBalance/PortfolioBalanceRefreshButton'

/**
 * The portfolio header carries no refresh affordance on native — mobile
 * refreshes the balance by pull-to-refresh instead. The leg exists so the
 * split is complete on both platforms: nothing throws if the web guard at the
 * call site is ever dropped.
 */
export function PortfolioBalanceRefreshButton(_: PortfolioBalanceRefreshButtonProps): JSX.Element | null {
  return null
}
