import { RowData, Table as TanstackTable } from '@tanstack/react-table'
import { Flex, zIndexes } from '@universe/mycelium'
import { ENTER_EXIT_PRESET_CLASSES } from '@universe/mycelium/compat'
import { Presence } from '@universe/mycelium/presence'
import { SPORE_ANIMATION_CURVE_CSS } from '@universe/tailwind/animations'
import { TableScrollMask } from '~/components/Table/TableScrollMask'
import { TableScrollButton } from '~/components/Table/TableSideScrollButtons/TableScrollButton'

type TableSideScrollButtonsProps<T extends RowData> = {
  showScrollLeftButton: boolean
  showScrollRightButton: boolean
  showRightFadeOverlay: boolean
  scrollButtonTop: number
  onScrollButtonPress: (direction: 'left' | 'right') => () => void
  table: TanstackTable<T>
  isSticky: boolean
  /** CSS width expression tracking an overridden pinned-region width (see TableProps.pinnedWidthOverride). */
  pinnedWidthOverride?: string
}

export function TableSideScrollButtons<T extends RowData>({
  showScrollLeftButton,
  showScrollRightButton,
  showRightFadeOverlay,
  scrollButtonTop,
  onScrollButtonPress,
  table,
  isSticky,
  pinnedWidthOverride,
}: TableSideScrollButtonsProps<T>): JSX.Element {
  return (
    <>
      <Presence>
        {showScrollLeftButton && (
          <Flex
            position="absolute"
            top={scrollButtonTop}
            left={pinnedWidthOverride ? `calc(${pinnedWidthOverride})` : table.getLeftTotalSize()}
            pl="$spacing12"
            zIndex={zIndexes.mask}
            className={ENTER_EXIT_PRESET_CLASSES.fadeInOut}
            // the legacy 200ms animation preset also glided mounted top/left repositions; scoped to geometry (not `all`) per the color-flash rule
            transition={`top ${SPORE_ANIMATION_CURVE_CSS['200ms']}, left ${SPORE_ANIMATION_CURVE_CSS['200ms']}`}
          >
            <TableScrollButton onPress={onScrollButtonPress('left')} direction="left" />
          </Flex>
        )}
      </Presence>
      <Presence>
        {showScrollRightButton && (
          <Flex
            position="absolute"
            top={scrollButtonTop}
            right={0}
            pr="$spacing12"
            zIndex={zIndexes.mask}
            className={ENTER_EXIT_PRESET_CLASSES.fadeInOut}
            // the legacy 200ms preset also glided mounted top repositions (right is fixed at 0)
            transition={`top ${SPORE_ANIMATION_CURVE_CSS['200ms']}`}
          >
            <TableScrollButton onPress={onScrollButtonPress('right')} direction="right" />
          </Flex>
        )}
      </Presence>
      {showRightFadeOverlay && (
        <TableScrollMask
          top={isSticky ? '$spacing12' : 0}
          zIndex={zIndexes.dropdown - 1}
          right={0}
          borderTopRightRadius="$rounded12"
        />
      )}
    </>
  )
}
