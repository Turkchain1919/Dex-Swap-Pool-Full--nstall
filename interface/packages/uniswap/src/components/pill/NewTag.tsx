import { ColorTokens, Flex, type FlexCompatProps, Text } from '@universe/mycelium'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

interface NewTagProps {
  backgroundColor?: ColorTokens
  textColor?: ColorTokens
  ml?: FlexCompatProps['ml']
  exclamation?: boolean
}

function NewTagInner({
  backgroundColor = '$accent2Hovered',
  textColor = '$accent1Hovered',
  ml = '$spacing6',
  exclamation = false,
}: NewTagProps): JSX.Element {
  const { t } = useTranslation()
  return (
    <Flex
      shrink
      centered
      ml={ml}
      px="$spacing4"
      py="$spacing2"
      backgroundColor={backgroundColor}
      borderRadius="$rounded6"
    >
      <Text variant="buttonLabel4" color={textColor}>
        {exclamation ? t('common.new.exclamation') : t('common.new')}
      </Text>
    </Flex>
  )
}

export const NewTag = memo(NewTagInner)
