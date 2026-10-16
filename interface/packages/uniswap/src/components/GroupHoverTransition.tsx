import { Flex } from '@universe/mycelium'
import { memo, ReactNode } from 'react'

interface GroupHoverTransitionProps {
  defaultContent: ReactNode
  hoverContent: ReactNode
  showTransition?: boolean
  height: number
  transition?: string
  useGroupItemHover?: boolean
  widthMode?: 'content' | 'container'
  /** When set, drives the slide from this flag instead of $group-hover (scoped row hover). */
  isHovered?: boolean
}

/**
 * Renders two content slots and slides from default to hover when the ancestor group anchor is
 * hovered (or when the explicit `isHovered` flag is set). Translate-only (no fade).
 * The group path requires a mycelium ancestor with the `group` prop (e.g. <Flex group> or
 * <Flex group="item">); a Tamagui anchor publishes no marker this component can read.
 * Caller should ensure defaultContent and hoverContent each have the given height.
 */
function _GroupHoverTransition({
  defaultContent,
  hoverContent,
  showTransition = true,
  height,
  transition = 'transform 0.1s ease-in-out',
  useGroupItemHover = false,
  widthMode = 'content',
  isHovered,
}: GroupHoverTransitionProps): JSX.Element {
  if (!showTransition) {
    return (
      <Flex position="relative" width="100%" overflow="hidden" height={height}>
        {defaultContent}
      </Flex>
    )
  }

  const hoverStyle = { y: -height }

  // Use widthMode='container' when the parent sets the width and the content needs to adapt.
  const wrapperProps =
    widthMode === 'container' ? ({ width: '100%', minWidth: 0 } as const) : ({ minWidth: 'max-content' } as const)

  if (isHovered !== undefined) {
    return (
      <Flex position="relative" overflow="hidden" height={height} {...wrapperProps}>
        <Flex
          alignItems="flex-start"
          transition={transition}
          flexDirection="column"
          y={isHovered ? -height : 0}
          height={height * 2}
        >
          {defaultContent}
          {hoverContent}
        </Flex>
      </Flex>
    )
  }

  return (
    <Flex position="relative" overflow="hidden" height={height} {...wrapperProps}>
      <Flex
        alignItems="flex-start"
        transition={transition}
        flexDirection="column"
        $group-hover={useGroupItemHover ? undefined : hoverStyle}
        $group-item-hover={useGroupItemHover ? hoverStyle : undefined}
        height={height * 2}
      >
        {defaultContent}
        {hoverContent}
      </Flex>
    </Flex>
  )
}

export const GroupHoverTransition = memo(_GroupHoverTransition)
