import type { UniverseChainId } from '@universe/chains'
import { Flex, type FlexCompatProps as FlexProps } from '@universe/mycelium'
import { useSyncExternalStore } from 'react'
import type { MenuOptionItem } from 'uniswap/src/components/menus/ContextMenu'
import { MENU_CONTENT_EMBEDDED_CONTAINER_STYLES, MenuContent } from 'uniswap/src/components/menus/ContextMenuContent'
import { MultichainContextMenuAddressSubview } from 'uniswap/src/components/MultichainTokenDetails/MultichainContextMenuAddressSubview'
import {
  MULTICHAIN_CONTEXT_MENU_ACTIONS_PANEL_WIDTH,
  MULTICHAIN_CONTEXT_MENU_ADDRESSES_PANEL_MAX_HEIGHT,
  MULTICHAIN_CONTEXT_MENU_ADDRESSES_PANEL_WIDTH,
} from 'uniswap/src/components/MultichainTokenDetails/multichainContextMenuLayout'
import type { MultichainTokenEntry } from 'uniswap/src/components/MultichainTokenDetails/useOrderedMultichainEntries'
import { ElementName, SectionName } from 'uniswap/src/features/telemetry/constants'

/** `DropdownMenuSheetItem` small: `py="$spacing8"` (16) + `$icon.16` content row. */
const MENU_ROW_HEIGHT = 31
/** `gap="$spacing4"` between rows in {@link MENU_CONTENT_EMBEDDED_CONTAINER_STYLES}. */
const MENU_ROW_GAP = 4
/** Outer shell vertical padding (`p="$spacing8"` × 2). */
const SHELL_VERTICAL_PADDING = 16

const EXPAND_SLIDE_OFFSET = MULTICHAIN_CONTEXT_MENU_ADDRESSES_PANEL_WIDTH - MULTICHAIN_CONTEXT_MENU_ACTIONS_PANEL_WIDTH
const ACTIONS_BACK_SLIDE_OFFSET = -EXPAND_SLIDE_OFFSET

/** Mirrors the `quickLong` preset in `ui/src/theme/animations`; spelled as CSS since new Tamagui `animation` props are banned (INFRA-2958). */
const TIMING = '300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
const SHELL_TRANSITION = `width ${TIMING}, height ${TIMING}`
const PANEL_TRANSITION = `opacity ${TIMING}, transform ${TIMING}`

type MultichainContextMenuExpandContentProps = {
  /** 0 = actions panel, 1 = addresses panel — same index as {@link useMultichainAddressViewState}. */
  viewIndex: number
  menuItems: MenuOptionItem[]
  orderedEntries: MultichainTokenEntry[]
  title: string
  onBack: () => void
  onCopyAddress: (address: string, chainId: UniverseChainId) => void | Promise<void>
  handleCloseMenu: () => void
  elementName?: ElementName
  sectionName?: SectionName
  trackItemClicks?: boolean
  containerStyles?: FlexProps
}

/**
 * In-place horizontal expansion for multichain token context menus (Figma "Context Menu Transition").
 * The popover grows from 200px → 304px while the per-chain address list slides in from the right.
 */
export function MultichainContextMenuExpandContent({
  viewIndex,
  menuItems,
  orderedEntries,
  title,
  onBack,
  onCopyAddress,
  handleCloseMenu,
  elementName,
  sectionName,
  trackItemClicks = false,
  containerStyles,
}: MultichainContextMenuExpandContentProps): JSX.Element {
  const isExpanded = viewIndex !== 0
  const prefersReducedMotion = usePrefersReducedMotion()
  const shellTransition = prefersReducedMotion ? undefined : SHELL_TRANSITION
  const panelTransition = prefersReducedMotion ? undefined : PANEL_TRANSITION
  const actionsPanelHeight = getActionsPanelHeight(menuItems.length)

  return (
    // oxlint-disable-next-line react/forbid-elements -- needed to stop event propagation to parent row
    <div
      onContextMenu={(e): void => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onClick={(e): void => {
        e.stopPropagation()
      }}
      onMouseDown={(e): void => {
        e.stopPropagation()
      }}
    >
      <Flex
        transition={shellTransition}
        width={isExpanded ? MULTICHAIN_CONTEXT_MENU_ADDRESSES_PANEL_WIDTH : MULTICHAIN_CONTEXT_MENU_ACTIONS_PANEL_WIDTH}
        height={isExpanded ? MULTICHAIN_CONTEXT_MENU_ADDRESSES_PANEL_MAX_HEIGHT : actionsPanelHeight}
        overflow="hidden"
        backgroundColor="$surface1"
        borderRadius="$rounded20"
        borderWidth={1}
        borderColor="$surface3"
        p="$spacing8"
        position="relative"
        {...containerStyles}
      >
        <Flex
          transition={panelTransition}
          opacity={isExpanded ? 0 : 1}
          x={isExpanded ? ACTIONS_BACK_SLIDE_OFFSET : 0}
          pointerEvents={isExpanded ? 'none' : 'auto'}
          position={isExpanded ? 'absolute' : 'relative'}
          top={0}
          left={0}
          width="100%"
          zIndex={isExpanded ? 0 : 1}
        >
          <MenuContent
            trackItemClicks={trackItemClicks}
            items={menuItems}
            handleCloseMenu={handleCloseMenu}
            elementName={elementName}
            sectionName={sectionName}
            containerStyles={MENU_CONTENT_EMBEDDED_CONTAINER_STYLES}
          />
        </Flex>

        <Flex
          transition={panelTransition}
          opacity={isExpanded ? 1 : 0}
          x={isExpanded ? 0 : EXPAND_SLIDE_OFFSET}
          pointerEvents={isExpanded ? 'auto' : 'none'}
          position={isExpanded ? 'relative' : 'absolute'}
          top={0}
          left={0}
          width="100%"
          flex={1}
          minHeight={0}
          zIndex={isExpanded ? 1 : 0}
        >
          <MultichainContextMenuAddressSubview
            embedded
            orderedEntries={orderedEntries}
            title={title}
            onCopyAddress={onCopyAddress}
            onBack={onBack}
          />
        </Flex>
      </Flex>
    </div>
  )
}

function getActionsPanelHeight(itemCount: number): number {
  if (itemCount <= 0) {
    return SHELL_VERTICAL_PADDING
  }

  return SHELL_VERTICAL_PADDING + itemCount * MENU_ROW_HEIGHT + (itemCount + 1) * MENU_ROW_GAP
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') {
        return () => undefined
      }
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      mediaQuery.addEventListener('change', onStoreChange)
      return () => mediaQuery.removeEventListener('change', onStoreChange)
    },
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  )
}
