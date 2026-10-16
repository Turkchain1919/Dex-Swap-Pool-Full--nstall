import { Flex, type FlexCompatProps, Text } from '@universe/mycelium'
import { ChartBarCrossed } from '@universe/mycelium/icons/ChartBarCrossed'
import { useIsDarkMode } from '@universe/mycelium/theme-hooks-compat'
import { useTranslation } from 'react-i18next'
import { ChartTooltip } from '~/components/Charts/ChartTooltip'

// `left`/`top` must stay "unset" so the banner escapes ChartTooltip's top-left
// anchoring and sits at the bottom of the chart instead.
function StaleBannerWrapper(props: FlexCompatProps): JSX.Element {
  return (
    <ChartTooltip
      borderRadius="$rounded16"
      left="unset"
      top="unset"
      bottom="$spacing40"
      p="$spacing12"
      backgroundColor="$surface4"
      borderColor="$surface3"
      {...props}
    />
  )
}

export function StaleBanner(): JSX.Element {
  const { t } = useTranslation()
  const isDarkTheme = useIsDarkMode()

  // TODO(WEB-3739): Update Chart UI to grayscale when data is stale
  return (
    <StaleBannerWrapper data-testid="chart-stale-banner" borderWidth={isDarkTheme ? 0 : 1}>
      <Flex row gap="$gap8">
        <ChartBarCrossed color="$neutral1" size="$icon.16" />
        <Text variant="body3" color="$neutral1">
          {t('common.dataOutdated')}
        </Text>
      </Flex>
    </StaleBannerWrapper>
  )
}
