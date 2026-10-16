import { Flex, iconSizes, Text, TouchableArea, zIndexes } from '@universe/mycelium'
import { ENTER_EXIT_PRESET_CLASSES } from '@universe/mycelium/compat'
import { Check } from '@universe/mycelium/icons/Check'
import { CopySheets } from '@universe/mycelium/icons/CopySheets'
import { Presence } from '@universe/mycelium/presence'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export function CopyButton({ onCopyPress }: { onCopyPress: () => Promise<void> }): JSX.Element {
  const { t } = useTranslation()

  const [valueCopied, setValueCopied] = useState(false)

  const onPress = async (): Promise<void> => {
    await onCopyPress()
    setValueCopied(true)
  }

  return (
    <Flex row gap="$spacing24">
      <TouchableArea borderRadius="$rounded20" zIndex={zIndexes.fixed} onPress={onCopyPress}>
        <Flex
          row
          alignItems="center"
          backgroundColor="$surface1"
          borderColor={valueCopied ? '$statusSuccess' : '$surface3'}
          borderRadius="$rounded20"
          borderWidth="$spacing1"
          gap="$spacing4"
          justifyContent="center"
          paddingEnd="$spacing16"
          px="$spacing8"
          py="$spacing8"
          shadowColor="$shadowColor"
          shadowOffset={{ width: 0, height: 0 }}
          shadowOpacity={0.1}
          shadowRadius={4}
          // fixed width means no resize on the animation to copied
          width={84}
          onPress={onPress}
        >
          <Presence exitBeforeEnter initial={false}>
            {/* note there's various x/y adjustments here due to visual imbalance of icons/text */}
            <Flex
              key={valueCopied ? 'copy' : 'copied'}
              row
              alignItems="center"
              className={ENTER_EXIT_PRESET_CLASSES.fadeInDownOutDown}
              gap="$spacing8"
              justifyContent="center"
              // copied check icon is less wide, content needs to move left to balance
              x={valueCopied ? -1 : 0}
            >
              {valueCopied ? (
                // check icon is a bit smaller and to the right; `x` is not on the icon's
                // supported style surface, so the offset moves onto a wrapping Flex.
                <Flex x={2}>
                  <Check color="$statusSuccess" size={iconSizes.icon12 + 2} />
                </Flex>
              ) : (
                <CopySheets color="$neutral2" size="$icon.12" />
              )}
              <Text
                color={valueCopied ? '$statusSuccess' : '$neutral2'}
                cursor="pointer"
                flexShrink={1}
                variant="buttonLabel3"
                x={valueCopied ? -2 : 0}
                y={0.5}
              >
                {valueCopied ? t('common.button.copied') : t('common.button.copy')}
              </Text>
            </Flex>
          </Presence>
        </Flex>
      </TouchableArea>
    </Flex>
  )
}
