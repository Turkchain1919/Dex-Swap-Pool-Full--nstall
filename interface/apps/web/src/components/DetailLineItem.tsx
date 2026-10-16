import { Flex, Text, type TextCompatProps } from '@universe/mycelium'
import { forwardRef, type ForwardRefExoticComponent, PropsWithChildren, type RefAttributes } from 'react'
import { LoadingRow } from '~/components/Loader/styled'
import { MouseoverTooltip, TooltipSize } from '~/components/Tooltip'
import { useIsMobile } from '~/hooks/screenSize/useIsMobile'
import { useHoverProps } from '~/hooks/useHoverProps'

export type LineItemData = {
  Label: React.FC
  Value: React.FC
  TooltipBody?: React.FC
  tooltipSize?: TooltipSize
  loaderWidth?: number
}

type LabelTextProps = TextCompatProps & { hasTooltip?: boolean }

// Explicit return type: forwardRef's inferred type isn't nameable under declaration emit (TS2883).
const LabelText: ForwardRefExoticComponent<LabelTextProps & RefAttributes<HTMLElement>> = forwardRef<
  HTMLElement,
  LabelTextProps
>(function LabelText({ hasTooltip, ...rest }, ref) {
  return (
    <Text
      ref={ref}
      variant="body3"
      color="$neutral2"
      userSelect="text"
      cursor={hasTooltip ? 'help' : 'auto'}
      {...rest}
    />
  )
})

const DetailRowValue: ForwardRefExoticComponent<TextCompatProps & RefAttributes<HTMLElement>> = forwardRef<
  HTMLElement,
  TextCompatProps
>(function DetailRowValue(props, ref) {
  return <Text ref={ref} variant="body3" color="$neutral1" textAlign="right" {...props} />
})

type ValueWrapperProps = PropsWithChildren<{
  lineItem: LineItemData
  labelHovered: boolean
  syncing: boolean
}>

function ValueWrapper({ children, lineItem, labelHovered, syncing }: ValueWrapperProps) {
  const { TooltipBody, tooltipSize, loaderWidth } = lineItem
  const isMobile = useIsMobile()

  if (syncing) {
    return <LoadingRow data-testid="loading-row" height={15} width={loaderWidth ?? 50} />
  }

  if (!TooltipBody) {
    return <DetailRowValue>{children}</DetailRowValue>
  }

  return (
    <MouseoverTooltip
      placement={isMobile ? 'auto' : 'right'}
      forceShow={labelHovered} // displays tooltip when hovering either both label or value
      size={tooltipSize}
      text={
        <Text variant="body4" color="$neutral2">
          <TooltipBody />
        </Text>
      }
    >
      <DetailRowValue>{children}</DetailRowValue>
    </MouseoverTooltip>
  )
}

export function DetailLineItem({ LineItem, syncing }: { LineItem: LineItemData; syncing?: boolean }) {
  const [labelHovered, hoverProps] = useHoverProps()

  return (
    <Flex row alignItems="center" justifyContent="space-between" width="100%">
      <LabelText {...hoverProps} hasTooltip={!!LineItem.TooltipBody} data-testid="swap-li-label">
        <LineItem.Label />
      </LabelText>
      <ValueWrapper lineItem={LineItem} labelHovered={labelHovered} syncing={syncing ?? false}>
        <LineItem.Value />
      </ValueWrapper>
    </Flex>
  )
}
