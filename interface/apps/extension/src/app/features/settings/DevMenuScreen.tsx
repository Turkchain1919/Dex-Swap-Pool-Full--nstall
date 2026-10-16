import { Accordion, Flex, ScrollView, Text } from '@universe/mycelium'
import { Chart } from '@universe/mycelium/icons/Chart'
import { Clock } from '@universe/mycelium/icons/Clock'
import { Wrench } from '@universe/mycelium/icons/Wrench'
import { ScreenHeader } from 'src/app/components/layout/ScreenHeader'
import { SettingsItem } from 'src/app/features/settings/components/SettingsItem'
import { DevImpersonateWallet } from 'src/app/features/settings/DevImpersonateWallet'
import { AppRoutes, SettingsRoutes } from 'src/app/navigation/constants'
import { useExtensionNavigation } from 'src/app/navigation/utils'
import { CacheConfig } from 'uniswap/src/components/gating/CacheConfig'
import { GatingOverrides } from 'uniswap/src/components/gating/GatingOverrides'
import { useAnalyticsDebugStore } from 'uniswap/src/features/telemetry/debug/useAnalyticsDebugStore'
import { useNativeAccountExists } from 'wallet/src/features/wallet/hooks'

/**
 * When modifying this component, take into consideration that this is used
 * both as a full screen page in the Sidebar, and as a modal in the Onboarding page.
 */
export function DevMenuScreen(): JSX.Element {
  const { navigateTo } = useExtensionNavigation()
  const analyticsDebugEnabled = useAnalyticsDebugStore((s) => s.enabled)
  // Impersonation needs a real wallet to fall back to, which onboarding (where this renders as a modal) has none of.
  const hasWallet = useNativeAccountExists()
  const toggleAnalyticsDebugger = useAnalyticsDebugStore((s) => s.actions.toggleEnabled)

  return (
    <ScrollView>
      <ScreenHeader title="Developer Settings" />

      <Flex gap="$spacing8">
        <Text variant="heading3" mt="$padding12">
          Debug Screens
        </Text>
        <SettingsItem
          Icon={Wrench}
          title="Sessions Debug"
          onPress={(): void => navigateTo(`/${AppRoutes.Settings}/${SettingsRoutes.SessionsDebug}`)}
        />
        <SettingsItem
          Icon={Clock}
          title="Hashcash Benchmark"
          onPress={(): void => navigateTo(`/${AppRoutes.Settings}/${SettingsRoutes.HashcashBenchmark}`)}
        />
        <SettingsItem
          Icon={Chart}
          title={analyticsDebugEnabled ? 'Disable Analytics Debugger' : 'Enable Analytics Debugger'}
          onPress={toggleAnalyticsDebugger}
        />

        <Text variant="heading3" mt="$padding12">
          Gating
        </Text>
        <Accordion collapsible type="single">
          <GatingOverrides />
        </Accordion>

        <Text variant="heading3" mt="$padding12">
          Miscellaneous
        </Text>
        <Accordion collapsible type="single">
          <CacheConfig />
          {hasWallet && <DevImpersonateWallet />}
        </Accordion>
      </Flex>
    </ScrollView>
  )
}
