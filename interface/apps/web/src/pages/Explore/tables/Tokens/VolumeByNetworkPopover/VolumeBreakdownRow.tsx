import { Flex, Text, TouchableArea } from '@universe/mycelium'
import { type ReactNode } from 'react'
import { GroupHoverTransition } from 'uniswap/src/components/GroupHoverTransition'
import { useEvent } from 'utilities/src/react/hooks'

/** When a bar segment is hovered, non-active breakdown rows use this opacity (matches bar segment dimming). */
const BREAKDOWN_ROW_DIM_OPACITY = 0.35

const ROW_HOVER_TRANSITION = 'opacity 0.2s ease-in-out'
const LABEL_SLOT_HEIGHT = 20

export interface VolumeBreakdownRowLabelProps {
  primaryLabel: string
  hoverLabel: string
  isHovered: boolean
}

/** Slides volume ↔ network name on row hover, driven by the row's tracked hover state. */
export function VolumeBreakdownRowLabel({
  primaryLabel,
  hoverLabel,
  isHovered,
}: VolumeBreakdownRowLabelProps): JSX.Element {
  return (
    <GroupHoverTransition
      height={LABEL_SLOT_HEIGHT}
      widthMode="container"
      isHovered={isHovered}
      defaultContent={
        <Text variant="body3" numberOfLines={1} height={LABEL_SLOT_HEIGHT} width="100%">
          {primaryLabel}
        </Text>
      }
      hoverContent={
        <Text variant="body3" numberOfLines={1} height={LABEL_SLOT_HEIGHT} width="100%">
          {hoverLabel}
        </Text>
      }
    />
  )
}

export type VolumeHoverSource = 'bar' | 'row'

export interface VolumeBreakdownRowProps {
  hoveredItemId: string | null
  hoverSource: VolumeHoverSource | null
  listSurfaceItemId: string | null
  itemId: string
  onRowHover: (id: string | null) => void
  onListSurfaceHover: (id: string | null) => void
  onPress: () => void
  children: ReactNode
}

export function VolumeBreakdownRow({
  hoveredItemId,
  hoverSource,
  listSurfaceItemId,
  itemId,
  onRowHover,
  onListSurfaceHover,
  onPress,
  children,
}: VolumeBreakdownRowProps): JSX.Element {
  const isDimmed = hoverSource === 'bar' && hoveredItemId !== null && hoveredItemId !== itemId
  const showListSurface = listSurfaceItemId === itemId

  const handleMouseEnter = useEvent(() => {
    onRowHover(itemId)
    onListSurfaceHover(itemId)
  })
  const handleMouseLeave = useEvent(() => {
    onRowHover(null)
    onListSurfaceHover(null)
  })

  return (
    <TouchableArea
      position="relative"
      width="100%"
      borderRadius="$rounded8"
      py="$spacing6"
      px="$spacing4"
      cursor="pointer"
      activeOpacity={1}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPress={onPress}
    >
      <Flex
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        borderRadius="$rounded12"
        // Mycelium TouchableArea skips the legacy hover-color injection, so the hovered token must be explicit
        backgroundColor="$surface1Hovered"
        opacity={showListSurface ? 1 : 0}
        pointerEvents="none"
        transition={ROW_HOVER_TRANSITION}
      />
      <Flex
        row
        alignItems="center"
        justifyContent="space-between"
        gap="$spacing8"
        position="relative"
        zIndex={1}
        opacity={isDimmed ? BREAKDOWN_ROW_DIM_OPACITY : 1}
        transition={ROW_HOVER_TRANSITION}
        py="$spacing2"
        px="$spacing4"
      >
        {children}
      </Flex>
    </TouchableArea>
  )
}
