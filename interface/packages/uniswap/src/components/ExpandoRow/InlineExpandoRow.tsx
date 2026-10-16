import { Flex, type FlexCompatProps as FlexProps, Text, TouchableArea } from '@universe/mycelium'
import { HeightAnimator } from '@universe/mycelium/height-animator'
import { ChevronsIn } from '@universe/mycelium/icons/ChevronsIn'
import { ChevronsOut } from '@universe/mycelium/icons/ChevronsOut'
import { type ReactNode } from 'react'

export interface InlineExpandoRowProps {
  isExpanded: boolean
  label: string
  onPress: () => void
  testID?: string
  body?: ReactNode
  px?: FlexProps['px']
  py?: FlexProps['py']
}

export function InlineExpandoRow({
  isExpanded,
  label,
  onPress,
  testID,
  body,
  px,
  py,
}: InlineExpandoRowProps): JSX.Element {
  return (
    <>
      <TouchableArea
        row
        gap="$gap8"
        alignItems="center"
        p="$spacing16"
        px={px}
        py={py}
        testID={testID}
        onPress={onPress}
      >
        <Text variant="body2" color="$neutral2">
          {label}
        </Text>
        <Flex justifyContent="center" testID="expando-row-icon">
          {isExpanded ? (
            <ChevronsIn color="$neutral2" size="$icon.20" />
          ) : (
            <ChevronsOut color="$neutral2" size="$icon.20" />
          )}
        </Flex>
      </TouchableArea>
      {body !== undefined && (
        <HeightAnimator useInitialHeight unmountChildrenWhenCollapsed open={isExpanded}>
          {body}
        </HeightAnimator>
      )}
    </>
  )
}
