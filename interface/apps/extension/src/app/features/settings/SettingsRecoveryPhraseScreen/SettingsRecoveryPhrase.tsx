import { Button, ButtonEmphasis, ButtonVariant, Flex, Text } from '@universe/mycelium'
import { ComponentProps } from 'react'

type SettingsRecoveryPhraseProps = {
  title: string
  titleColor?: ComponentProps<typeof Text>['color']
  subtitle: React.ReactNode
  icon: React.ReactNode
  iconBackgroundColor?: ComponentProps<typeof Flex>['backgroundColor']
  nextButtonEnabled: boolean
  nextButtonText: string
  nextButtonVariant?: ButtonVariant
  nextButtonEmphasis?: ButtonEmphasis
  onNextPressed: () => void
  children: React.ReactNode
}

export function SettingsRecoveryPhrase({
  title,
  titleColor = '$statusCritical',
  subtitle,
  icon,
  iconBackgroundColor = '$statusCritical2',
  nextButtonEnabled,
  nextButtonText,
  nextButtonVariant,
  nextButtonEmphasis,
  onNextPressed,
  children,
}: SettingsRecoveryPhraseProps): JSX.Element {
  return (
    <Flex grow justifyContent="space-between" p="$spacing4" pt="$spacing24">
      <Flex alignItems="flex-start" gap="$spacing16">
        <Flex
          alignItems="center"
          justifyContent="center"
          backgroundColor={iconBackgroundColor}
          borderRadius="$rounded8"
          p="$spacing8"
        >
          {icon}
        </Flex>
        <Flex gap="$spacing4" mb="$spacing24">
          <Text color={titleColor} variant="subheading1">
            {title}
          </Text>
          <Text color="$neutral2" variant="body3">
            {subtitle}
          </Text>
        </Flex>
      </Flex>
      <Flex grow>{children}</Flex>
      <Flex row mt="$spacing12">
        <Button
          disabled={!nextButtonEnabled}
          variant={nextButtonVariant}
          emphasis={nextButtonEmphasis}
          onPress={onNextPressed}
        >
          {nextButtonText}
        </Button>
      </Flex>
    </Flex>
  )
}
