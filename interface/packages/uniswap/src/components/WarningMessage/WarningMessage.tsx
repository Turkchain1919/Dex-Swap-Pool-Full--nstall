import { ColorTokens, Flex, Text } from '@universe/mycelium'
import { AlertTriangleFilled } from '@universe/mycelium/icons/AlertTriangleFilled'
import { TooltipCompat as Tooltip } from '@universe/mycelium/tooltip-compat'

interface WarningMessageProps {
  warningMessage: string
  color: ColorTokens
  tooltipText?: string
}

export function WarningMessage({ warningMessage, color, tooltipText }: WarningMessageProps): JSX.Element {
  const warningContent = (
    <Flex row alignItems="center" gap="$gap4">
      <AlertTriangleFilled color={color} size="$icon.16" />
      <Text variant="body3" color={color}>
        {warningMessage}
      </Text>
    </Flex>
  )

  if (tooltipText) {
    return (
      <Tooltip>
        <Tooltip.Trigger>{warningContent}</Tooltip.Trigger>
        <Tooltip.Content>
          <Text variant="body4">{tooltipText}</Text>
        </Tooltip.Content>
      </Tooltip>
    )
  }

  return warningContent
}
