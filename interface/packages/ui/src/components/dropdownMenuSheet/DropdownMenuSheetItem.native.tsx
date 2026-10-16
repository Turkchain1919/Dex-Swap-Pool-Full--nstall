import { Flex, type FlexCompatProps, Text, TouchableArea, type TouchableAreaCompatProps } from '@universe/mycelium'
import { CheckCircleFilled } from '@universe/mycelium/icons/CheckCircleFilled'
import { ExternalLink } from '@universe/mycelium/icons/ExternalLink'
import { type BaseSyntheticEvent, useMemo } from 'react'
import { I18nManager } from 'react-native'
import type { DropdownMenuSheetItemProps } from 'ui/src/components/dropdownMenuSheet/DropdownMenuSheetItem'
import { getMenuItemColor } from 'ui/src/components/dropdownMenuSheet/utils'
import { useEvent } from 'utilities/src/react/hooks'

/**
 * Native leg: `@universe/mycelium/menu-compat` (INFRA-3021) is web-only, so
 * native keeps its own render on the general Flex/Text/TouchableArea compat
 * primitives instead of the specialized `DropdownMenuSheetItemCompat`.
 */
export const DropdownMenuSheetItem = ({
  label,
  icon,
  actionType = 'default',
  isSelected,
  disabled,
  destructive,
  closeDelay,
  textColor,
  variant,
  height,
  role = 'button',
  subheader,
  rightElement,
  allowMultiline = false,
  onPress,
  handleCloseMenu,
}: DropdownMenuSheetItemProps): JSX.Element => {
  const handlePress = useEvent((e: BaseSyntheticEvent) => {
    e.stopPropagation()
    e.preventDefault()

    onPress()

    if (handleCloseMenu) {
      if (typeof closeDelay === 'number') {
        setTimeout(handleCloseMenu, closeDelay)
      } else {
        handleCloseMenu()
      }
    }
  })

  const flexDirection: FlexCompatProps['flexDirection'] = I18nManager.isRTL ? 'row-reverse' : 'row'
  // hoverStyle is inert on native (no hover capability on touch) -- inherited from the
  // pre-split shared implementation, where it mattered only on its web render.
  const touchableAreaHoverStyle: TouchableAreaCompatProps['hoverStyle'] = useMemo(
    () => (disabled ? undefined : { backgroundColor: '$surface1Hovered' }),
    [disabled],
  )

  const textColorValue = useMemo(
    () => getMenuItemColor({ overrideColor: textColor, destructive, disabled }),
    [destructive, textColor, disabled],
  )

  // Prevents press events from bubbling to parent touchable areas (e.g., row wrappers).
  // onPress alone isn't enough: onPressIn/onPressOut are separate gesture-lifecycle events
  // (press-down / press-up), each bubbling independently of the tap-completion event onPress
  // stops, so a parent's own onPressIn/onPressOut still fires unless stopped here too.
  const stopPressEventPropagation = useEvent((e: BaseSyntheticEvent): void => {
    e.stopPropagation()
  })

  return (
    <TouchableArea
      group
      hoverable
      flexGrow={1}
      py="$spacing8"
      px={variant === 'small' ? '$spacing12' : '$spacing8'}
      gap="$spacing8"
      flexDirection={flexDirection}
      justifyContent="space-between"
      alignItems="center"
      disabled={disabled}
      borderRadius="$rounded12"
      userSelect="none"
      role={role}
      cursor={disabled ? 'default' : 'pointer'}
      backgroundColor="$background"
      height={height}
      hoverStyle={touchableAreaHoverStyle}
      onPressIn={stopPressEventPropagation}
      onPressOut={stopPressEventPropagation}
      onPress={handlePress}
    >
      {/* gap only renders between siblings, so it's a no-op here when icon is absent (single child) --
          equivalent to the old conditional Spacer without needing the conditional. */}
      <Flex grow shrink minWidth={0} flexDirection={flexDirection} alignItems="center" gap="$spacing8">
        {icon && <Flex flexShrink={0}>{icon}</Flex>}
        {/* Allow text to ellipsize and not overflow the container, because of the padding */}
        {/* on the parent container. */}
        <Flex maxWidth="90%">
          <Text
            flexShrink={1}
            {...(allowMultiline ? {} : { numberOfLines: 1, ellipsizeMode: 'tail' as const })}
            variant={variant === 'small' ? 'buttonLabel3' : 'buttonLabel2'}
            color={textColorValue}
          >
            {label}
          </Text>
          {subheader && (
            <Text numberOfLines={1} ellipsizeMode="tail" variant="body4" color="$neutral2">
              {subheader}
            </Text>
          )}
        </Flex>
      </Flex>
      {(actionType === 'external-link' || rightElement) && (
        <Flex flexShrink={0} alignItems="flex-end">
          {actionType === 'external-link' && (
            <ExternalLink size={subheader ? '$icon.20' : '$icon.16'} color="$neutral2" />
          )}
          {rightElement}
        </Flex>
      )}

      {isSelected !== undefined && (
        <Flex flexShrink={0}>
          {isSelected ? <CheckCircleFilled size="$icon.20" /> : <Flex width="$spacing20" height="$spacing20" />}
        </Flex>
      )}
    </TouchableArea>
  )
}
