import { Flex, Text } from '@universe/mycelium'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { TokenDetailsMarketData } from 'src/components/TokenDetails/TokenDetailsStats/TokenDetailsMarketData'

export const TokenDetailsStats = memo(function TokenDetailsStatsInner(): JSX.Element {
  const { t } = useTranslation()

  return (
    <Flex gap="$spacing4" px="$spacing16">
      <Text color="$neutral2" variant="subheading2">
        {t('token.stats.title')}
      </Text>

      <TokenDetailsMarketData />
    </Flex>
  )
})
