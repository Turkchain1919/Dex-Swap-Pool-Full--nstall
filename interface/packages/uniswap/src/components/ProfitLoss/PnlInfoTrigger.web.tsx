import { Flex } from '@universe/mycelium'
// Web-only: the native leg keeps the ui/src import until INFRA-3716 gives mycelium icons a native leg.
import { InfoCircleFilled } from '@universe/mycelium/icons/InfoCircleFilled'
import { TooltipCompat as Tooltip } from '@universe/mycelium/tooltip-compat'
import { PnlDefinitionsList } from 'uniswap/src/components/ProfitLoss/PnlDefinitions'
import { PnlInfoTriggerProps } from 'uniswap/src/components/ProfitLoss/PnlInfoTrigger'

const TOOLTIP_REST_MS = 20
const TOOLTIP_CLOSE_MS = 100

export function PnlInfoTrigger({ metrics, footer }: PnlInfoTriggerProps): JSX.Element {
  return (
    <Tooltip delay={{ close: TOOLTIP_CLOSE_MS, open: 0 }} placement="top" restMs={TOOLTIP_REST_MS}>
      <Tooltip.Trigger>
        <Flex>
          <InfoCircleFilled color="$neutral3" size="$icon.16" />
        </Flex>
      </Tooltip.Trigger>
      <Tooltip.Content pointerEvents="auto" maxWidth={320}>
        <PnlDefinitionsList metrics={metrics} footer={footer} />
        <Tooltip.Arrow />
      </Tooltip.Content>
    </Tooltip>
  )
}
