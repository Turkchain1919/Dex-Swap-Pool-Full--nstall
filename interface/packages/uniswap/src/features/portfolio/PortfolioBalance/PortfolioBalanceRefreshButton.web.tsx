import { RefreshButtonCompat } from '@universe/mycelium/refresh-button-compat'
import { useTranslation } from 'react-i18next'
import type { PortfolioBalanceRefreshButtonProps } from 'uniswap/src/features/portfolio/PortfolioBalance/PortfolioBalanceRefreshButton'

/**
 * `RefreshButtonCompat` pairs with the mycelium group anchor that
 * `AnimatedNumber.web.tsx` emits: the reveal ships as Tailwind's own
 * `group-hover:` variant, which resolves against the literal `group` class on
 * that anchor. The legacy `ui/src` `RefreshButton` compiled its reveal to a
 * Tamagui `.t_group_true` descendant rule instead, which the mycelium anchor
 * never marks — that mismatch is what left the button invisible but clickable
 * (INFRA-3779).
 *
 * `tooltipLabel` is resolved here rather than at the call site because mycelium
 * carries no i18n runtime; `common.refresh` is the same key the legacy web leg
 * looked up itself.
 */
export function PortfolioBalanceRefreshButton({
  onPress,
  isLoading,
  disabled,
}: PortfolioBalanceRefreshButtonProps): JSX.Element {
  const { t } = useTranslation()

  return (
    <RefreshButtonCompat
      disabled={disabled}
      isLoading={isLoading}
      tooltipLabel={t('common.refresh')}
      onPress={onPress}
    />
  )
}
