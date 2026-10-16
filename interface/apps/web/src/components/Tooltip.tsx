import { cn, Flex, Text } from '@universe/mycelium'
import { styled } from '@universe/mycelium/styled'
import {
  ComponentPropsWithoutRef,
  CSSProperties,
  Fragment,
  memo,
  MouseEventHandler,
  PropsWithChildren,
  ReactNode,
  useEffect,
  useState,
} from 'react'
import { noop } from 'utilities/src/react/noop'
import { Popover, PopoverProps } from '~/components/Popover'

export enum TooltipSize {
  ExtraSmall = 'extraSmall',
  Small = 'small',
  Large = 'large',
  Max = 'max',
}

const PADDING_CLASS_FOR_SIZE: Record<TooltipSize, string> = {
  [TooltipSize.ExtraSmall]: 'p-[8px]',
  [TooltipSize.Max]: 'p-[8px]',
  [TooltipSize.Small]: 'p-[12px]',
  [TooltipSize.Large]: '[padding:16px_20px]',
}

const MAX_WIDTH_CLASS_FOR_SIZE: Record<TooltipSize, string> = {
  [TooltipSize.ExtraSmall]: 'max-w-[200px]',
  [TooltipSize.Small]: 'max-w-[256px]',
  [TooltipSize.Large]: 'max-w-[400px]',
  [TooltipSize.Max]: 'max-w-max',
}

const TooltipContainerFrame = styled('div', {
  platform: 'web',
  base: 'cursor-default pointer-events-auto text-neutral1 font-[485] text-[12px] [line-height:16px] [word-break:break-word] bg-surface1 rounded-[12px] border border-surface3 [box-shadow:0px_6px_12px_-3px_rgba(0,0,0,0.05),0px_2px_5px_-2px_rgba(0,0,0,0.03)]',
})

function TooltipContainer({
  size,
  padding,
  fitContent,
  style,
  ...rest
}: {
  size: TooltipSize
  padding?: number
  fitContent?: boolean
  style?: CSSProperties
} & Omit<ComponentPropsWithoutRef<typeof TooltipContainerFrame>, 'style'>) {
  return (
    <TooltipContainerFrame
      className={cn(
        MAX_WIDTH_CLASS_FOR_SIZE[size],
        size === TooltipSize.Max ? 'w-auto' : fitContent ? 'w-max' : 'w-[calc(100vw-16px)]',
        padding === undefined && PADDING_CLASS_FOR_SIZE[size],
      )}
      style={padding === undefined ? style : { padding: `${padding}px`, ...style }}
      {...rest}
    />
  )
}

type MouseoverTooltipProps = Omit<PopoverProps, 'content' | 'show'> &
  PropsWithChildren<{
    text: ReactNode
    size?: TooltipSize
    /** Shrink the tooltip to its content, using `size` as a max-width instead of a fixed width */
    fitContent?: boolean
    disabled?: boolean
    timeout?: number
    placement?: PopoverProps['placement']
    onOpen?: () => void
    onClick?: MouseEventHandler<HTMLDivElement>
    forceShow?: boolean
    padding?: number
  }>

export const MouseoverTooltip = memo(function MouseoverTooltip(props: MouseoverTooltipProps) {
  const { text, disabled, children, onOpen, onClick, forceShow, timeout, padding, fitContent, ...rest } = props
  const [show, setShow] = useState(false)
  const open = () => {
    setShow(true)
    onOpen?.()
  }
  const close = () => setShow(false)

  useEffect(() => {
    if (show && timeout) {
      const tooltipTimer = setTimeout(() => {
        setShow(false)
      }, timeout)

      return () => {
        clearTimeout(tooltipTimer)
      }
    }
    return undefined
  }, [timeout, show])

  if (disabled) {
    return <Fragment>{children}</Fragment>
  }

  return (
    <Popover
      content={
        text && (
          <TooltipContainer
            padding={padding}
            size={props.size ?? TooltipSize.Small}
            fitContent={fitContent}
            onMouseEnter={open}
            onMouseLeave={close}
            onClick={onClick}
          >
            {text}
          </TooltipContainer>
        )
      }
      show={forceShow || show}
      {...rest}
    >
      <Flex cursor="default" onMouseEnter={open} onMouseLeave={timeout ? noop : close}>
        {typeof children === 'string' || typeof children === 'number' ? (
          <Text variant="body3">{children}</Text>
        ) : (
          children
        )}
      </Flex>
    </Popover>
  )
})
