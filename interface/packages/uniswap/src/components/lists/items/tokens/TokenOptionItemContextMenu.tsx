import { Currency } from '@uniswap/sdk-core'
import { isWebPlatform } from '@universe/environment'
import React, { ReactNode, useState } from 'react'
import {
  TokenContextMenuAction,
  UseSearchTokenMenuItemsParams,
  useSearchTokenMenuItems,
} from 'uniswap/src/components/lists/items/tokens/useSearchTokenMenuItems'
import { ContextMenu, ContextMenuProps } from 'uniswap/src/components/menus/ContextMenu'
import { ContextMenuTriggerMode } from 'uniswap/src/components/menus/types'
import { ElementName, SectionName } from 'uniswap/src/features/telemetry/constants'
import type { CurrencyId } from 'uniswap/src/types/currency'
import { currencyId } from 'uniswap/src/utils/currencyId'

export { TokenContextMenuAction } from 'uniswap/src/components/lists/items/tokens/useSearchTokenMenuItems'

interface TokenOptionItemContextMenuProps {
  children: ReactNode
  currency: Currency
  isHiddenFromPortfolio?: boolean
  isOpen: boolean
  openMenu?: ContextMenuProps['openMenu']
  closeMenu: ContextMenuProps['closeMenu']
  triggerMode?: ContextMenuTriggerMode
  actions: TokenContextMenuAction[]
  copyAddressOverride?: UseSearchTokenMenuItemsParams['copyAddressOverride']
}

/**
 * A wrapper to defer mounting the `ContextMenu` until the first time it is opened.
 * Cuts ~40ms form each render which is worthwhile for items in long lists.
 * Only safe when the consumer drives `isOpen`. Given `openMenu`, `ContextMenu` owns the trigger,
 *   and no trigger means `isOpen` can never flip.
 */
function TokenOptionItemContextMenuInner(props: TokenOptionItemContextMenuProps): JSX.Element {
  const canDefer = props.openMenu === undefined
  // Keyed by currency id so a recycled cell resets, and so a refetch rebuilding `CurrencyInfo`
  // doesn't drop the latch and trigger the remount above.
  const rowCurrencyId = currencyId(props.currency)
  const [openedForCurrencyId, setOpenedForCurrencyId] = useState<CurrencyId | undefined>(
    props.isOpen ? rowCurrencyId : undefined,
  )
  const hasEverOpened = openedForCurrencyId === rowCurrencyId

  // Set during render, not in an effect: an effect commits a frame with `isOpen` true and the menu
  // still unmounted, dropping the first open.
  if (props.isOpen && !hasEverOpened) {
    setOpenedForCurrencyId(rowCurrencyId)
  }

  if (canDefer && !hasEverOpened) {
    return <>{props.children}</>
  }

  return <MountedTokenOptionItemContextMenu {...props} />
}

function MountedTokenOptionItemContextMenu({
  children,
  currency,
  isOpen,
  openMenu,
  closeMenu,
  triggerMode = ContextMenuTriggerMode.Secondary,
  actions,
  copyAddressOverride,
}: TokenOptionItemContextMenuProps): JSX.Element {
  const { menuItems } = useSearchTokenMenuItems({ currency, closeMenu, actions, copyAddressOverride })

  return (
    <ContextMenu
      trackItemClicks
      menuItems={menuItems}
      triggerMode={triggerMode}
      isOpen={isOpen}
      closeMenu={closeMenu}
      openMenu={openMenu}
      offsetY={4}
      elementName={ElementName.SearchTokenContextMenu}
      sectionName={isWebPlatform ? SectionName.NavbarSearch : SectionName.ExploreSearch}
    >
      {children}
    </ContextMenu>
  )
}

export const TokenOptionItemContextMenu = React.memo(TokenOptionItemContextMenuInner)
