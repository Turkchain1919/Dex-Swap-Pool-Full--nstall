import { Flex, Text, TouchableArea } from '@universe/mycelium'
import { markHoverable, styled } from '@universe/mycelium/styled'
import { useState } from 'react'
import { Dropdown } from '~/components/Dropdowns/Dropdown'
import { ActionButtonStyle } from '~/components/StickyCollapsibleHeader/HeaderActions/ActionButtonStyle'
import { HeaderActionRowContent } from '~/components/StickyCollapsibleHeader/HeaderActions/HeaderActionRowContent'
import {
  type HeaderAction,
  type HeaderActionWithDropdown,
  isHeaderActionWithDropdown,
} from '~/components/StickyCollapsibleHeader/HeaderActions/types'
import { MouseoverTooltip, TooltipSize } from '~/components/Tooltip'
import { openExternalLink } from '~/utils/openExternalLink'

// The empty variants table pins the factory's variant generic: a hover-only
// config has no other inference site, so V falls back to its open constraint
// and the index signature collapses the base component's prop surface.
const DropdownAction = styled(markHoverable(TouchableArea), {
  variants: {},
  base: 'flex flex-row items-center p-2 rounded-8 gap-3 h-10',
  hover: [{ class: 'bg-surface2-hovered' }],
})

interface DesktopHeaderActionsProps {
  actions: HeaderAction[]
}

const DROPDOWN_MIN_WIDTH = 200

function DropdownHeaderAction({ action }: { action: HeaderActionWithDropdown }): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const visibleItems = action.dropdownItems.filter((item) => item.show !== false)

  return (
    <Dropdown
      isOpen={isOpen}
      toggleOpen={setIsOpen}
      menuLabel={action.icon as JSX.Element}
      hideChevron
      buttonStyle={ActionButtonStyle}
      dropdownStyle={{ width: 'max-content', minWidth: DROPDOWN_MIN_WIDTH }}
      alignRight
    >
      {visibleItems.map((item) => (
        <DropdownAction
          key={item.title}
          {...(item.href
            ? {
                tag: 'a',
                onPress: () => openExternalLink(item.href!),
              }
            : { onPress: item.onPress })}
        >
          <HeaderActionRowContent
            title={item.title}
            textColor={item.textColor}
            icon={item.icon}
            subtitle={item.subtitle}
            trailingIcon={item.trailingIcon}
          />
        </DropdownAction>
      ))}
    </Dropdown>
  )
}

export function DesktopHeaderActions({ actions }: DesktopHeaderActionsProps): JSX.Element {
  return (
    <Flex row gap="$gap8" alignItems="center">
      {actions.map((action) =>
        action.show ? (
          isHeaderActionWithDropdown(action) ? (
            <MouseoverTooltip key={action.title} text={action.title} placement="top" size={TooltipSize.Max}>
              <DropdownHeaderAction action={action} />
            </MouseoverTooltip>
          ) : (
            <MouseoverTooltip key={action.title} text={action.title} placement="top" size={TooltipSize.Max}>
              <TouchableArea
                {...(action.href
                  ? {
                      tag: 'a',
                      onPress: () => openExternalLink(action.href!),
                    }
                  : { onPress: action.onPress })}
                {...ActionButtonStyle}
              >
                <Text color={action.textColor ?? '$neutral1'} lineHeight={0}>
                  {action.icon}
                </Text>
              </TouchableArea>
            </MouseoverTooltip>
          )
        ) : null,
      )}
    </Flex>
  )
}
