import '~/components/Popover.css'
import { Options, Placement } from '@popperjs/core'
import Portal from '@reach/portal'
import { zIndexes } from '@universe/mycelium'
import { styled } from '@universe/mycelium/styled'
import React, { CSSProperties, memo, useCallback, useMemo, useState } from 'react'
import { usePopper } from 'react-popper'
import { useInterval } from '~/lib/hooks/useInterval'

const PopoverContainer = styled('div', {
  platform: 'web',
  base: 'pointer-events-none [transition:visibility_150ms_linear,opacity_150ms_linear] text-neutral2',
  variants: {
    show: {
      true: 'visible opacity-100',
      false: 'invisible opacity-0',
    },
  },
  inlineStyle: () => ({ zIndex: zIndexes.popover }),
})

const ReferenceElement = styled('div', {
  platform: 'web',
  base: 'inline-block h-[inherit]',
})

const Arrow = styled('div', {
  platform: 'web',
  base: 'popover-arrow',
})

export interface PopoverProps {
  content: React.ReactNode
  show: boolean
  children?: React.ReactNode
  placement?: Placement
  offsetX?: number
  offsetY?: number
  hideArrow?: boolean
  showInline?: boolean
  style?: CSSProperties
}

export const Popover = memo(function Popover({
  content,
  show,
  children,
  placement = 'auto',
  offsetX = 8,
  offsetY = 8,
  hideArrow = false,
  showInline = false,
  style,
}: PopoverProps) {
  const [referenceElement, setReferenceElement] = useState<HTMLDivElement | null>(null)
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null)
  const [arrowElement, setArrowElement] = useState<HTMLDivElement | null>(null)

  const options: Options = useMemo(
    () => ({
      placement,
      strategy: 'fixed',
      modifiers: [
        { name: 'offset', options: { offset: [offsetX, offsetY] } },
        { name: 'arrow', options: { element: arrowElement } },
        // altAxis keeps side placements (left/right) from overflowing the viewport horizontally on narrow screens
        { name: 'preventOverflow', options: { padding: 8, altAxis: true } },
      ],
    }),
    [placement, offsetX, offsetY, arrowElement],
  )

  const { styles, update, attributes } = usePopper(referenceElement, show ? popperElement : null, options)

  const updateCallback = useCallback(() => {
    update && update()
  }, [update])
  useInterval(updateCallback, show ? 100 : null)

  return showInline ? (
    <PopoverContainer show={show}>{content}</PopoverContainer>
  ) : (
    <>
      <ReferenceElement style={style} ref={setReferenceElement as any}>
        {children}
      </ReferenceElement>
      <Portal>
        <PopoverContainer show={show} ref={setPopperElement as any} style={styles.popper} {...attributes.popper}>
          {content}
          {!hideArrow && (
            <Arrow
              className={`arrow-${attributes.popper?.['data-popper-placement'] ?? ''}`}
              ref={setArrowElement as any}
              style={styles.arrow}
              {...attributes.arrow}
            />
          )}
        </PopoverContainer>
      </Portal>
    </>
  )
})
