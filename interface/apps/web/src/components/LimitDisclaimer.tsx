import { Flex, type FlexProps, Text, type TextCompatProps } from '@universe/mycelium'
import { useTranslation } from 'react-i18next'
import { ExternalLink } from '~/theme/components/Links'

function DisclaimerText(props: TextCompatProps): JSX.Element {
  return <Text variant="body4" color="$neutral2" {...props} />
}

export function LimitDisclaimer(props: FlexProps) {
  const { t } = useTranslation()

  return (
    <Flex backgroundColor="$surface2" borderRadius="$rounded12" p="$spacing12" mt="$spacing12" gap="$gap4" {...props}>
      <DisclaimerText>{t('pool.limitFluctuation.warning')}</DisclaimerText>
      <DisclaimerText>{t('pool.limitFluctuation.cancelNetworkCost')}</DisclaimerText>
      <DisclaimerText>
        <ExternalLink href="https://support.uniswap.org/hc/en-us/articles/24300813697933">
          {t('common.button.learn')}
        </ExternalLink>
      </DisclaimerText>
    </Flex>
  )
}
