import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ExperimentsModal } from 'src/app/modals/ExperimentsModal'
import { NotificationsOSSettingsModal } from 'src/app/modals/NotificationsOSSettingsModal'
import { navNativeStackOptions } from 'src/app/navigation/navStackOptions'
import { type SettingsStackParamList } from 'src/app/navigation/types'
import { RestoreWalletModal } from 'src/components/RestoreWalletModal/RestoreWalletModal'
import { UnitagsIntroModal } from 'src/components/unitags/UnitagsIntroModal'
import { DebugScreensScreen } from 'src/screens/DebugScreensScreen'
import { DevScreen } from 'src/screens/DevScreen'
import { SettingsCloudBackupPasswordConfirmScreen } from 'src/screens/SettingsCloudBackupPasswordConfirmScreen'
import { SettingsCloudBackupPasswordCreateScreen } from 'src/screens/SettingsCloudBackupPasswordCreateScreen'
import { SettingsCloudBackupProcessingScreen } from 'src/screens/SettingsCloudBackupProcessingScreen'
import { SettingsCloudBackupStatus } from 'src/screens/SettingsCloudBackupStatus'
import { SettingsDisclosuresScreen } from 'src/screens/SettingsDisclosuresScreen'
import { SettingsNotificationsScreen } from 'src/screens/SettingsNotificationsScreen'
import { SettingsPrivacyScreen } from 'src/screens/SettingsPrivacyScreen'
import { SettingsScreen } from 'src/screens/SettingsScreen'
import { SettingsSmartWalletScreen } from 'src/screens/SettingsSmartWalletScreen'
import { SettingsStorageScreen } from 'src/screens/SettingsStorageScreen'
import { SettingsViewSeedPhraseScreen } from 'src/screens/SettingsViewSeedPhraseScreen'
import { SettingsWalletManageConnection } from 'src/screens/SettingsWalletManageConnection'
import { ViewPrivateKeysScreen } from 'src/screens/ViewPrivateKeys/ViewPrivateKeysScreen'
import { WebViewScreen } from 'src/screens/WebViewScreen'
import { ModalName } from 'uniswap/src/features/telemetry/constants'
import { MobileScreens } from 'uniswap/src/types/screens/mobile'

/**
 * Uses process.env directly so the bundler can statically evaluate these
 * to false in release builds and tree-shake prototype/e2e code paths.
 * Kept module-local (duplicated from navigation.tsx) because the static
 * evaluation only works within the module that reads process.env.
 */
const enabledInEnvOrDev =
  // @ts-expect-error - process.env is not typed with these
  // oxlint-disable-next-line eslint-js/no-restricted-syntax
  process.env.INCLUDE_PROTOTYPE_FEATURES === 'true' || process.env.IS_E2E_TEST === 'true' || __DEV__

const SettingsStack = createNativeStackNavigator<SettingsStackParamList>()

export function SettingsStackGroup(): JSX.Element {
  return (
    <SettingsStack.Navigator
      screenOptions={{
        ...navNativeStackOptions.noHeader,
        fullScreenGestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      <SettingsStack.Screen component={SettingsScreen} name={MobileScreens.Settings} />
      <SettingsStack.Screen
        component={SettingsWalletManageConnection}
        name={MobileScreens.SettingsWalletManageConnection}
      />
      <SettingsStack.Screen component={WebViewScreen} name={MobileScreens.WebView} />
      <SettingsStack.Screen component={DevScreen} name={MobileScreens.Dev} />
      <SettingsStack.Screen component={DebugScreensScreen} name={MobileScreens.DebugScreens} />
      <SettingsStack.Screen component={SettingsViewSeedPhraseScreen} name={MobileScreens.SettingsViewSeedPhrase} />
      <SettingsStack.Screen
        component={SettingsCloudBackupPasswordCreateScreen}
        name={MobileScreens.SettingsCloudBackupPasswordCreate}
      />
      <SettingsStack.Screen
        component={SettingsCloudBackupPasswordConfirmScreen}
        name={MobileScreens.SettingsCloudBackupPasswordConfirm}
      />
      <SettingsStack.Screen
        component={SettingsCloudBackupProcessingScreen}
        name={MobileScreens.SettingsCloudBackupProcessing}
      />
      <SettingsStack.Screen component={SettingsCloudBackupStatus} name={MobileScreens.SettingsCloudBackupStatus} />
      <SettingsStack.Screen component={SettingsSmartWalletScreen} name={MobileScreens.SettingsSmartWallet} />
      <SettingsStack.Screen component={SettingsStorageScreen} name={MobileScreens.SettingsStorage} />
      <SettingsStack.Screen component={SettingsPrivacyScreen} name={MobileScreens.SettingsPrivacy} />
      <SettingsStack.Screen component={SettingsDisclosuresScreen} name={MobileScreens.SettingsDisclosures} />
      <SettingsStack.Screen component={SettingsNotificationsScreen} name={MobileScreens.SettingsNotifications} />
      <SettingsStack.Screen component={ViewPrivateKeysScreen} name={MobileScreens.ViewPrivateKeys} />
      <SettingsStack.Group screenOptions={navNativeStackOptions.presentationBottomSheet}>
        <SettingsStack.Screen component={NotificationsOSSettingsModal} name={ModalName.NotificationsOSSettings} />
        <SettingsStack.Screen component={UnitagsIntroModal} name={ModalName.UnitagsIntro} />
        <SettingsStack.Screen component={RestoreWalletModal} name={ModalName.RestoreWallet} />
        {enabledInEnvOrDev &&
          ((): JSX.Element => {
            return <SettingsStack.Screen component={ExperimentsModal} name={ModalName.Experiments} />
          })()}
      </SettingsStack.Group>
    </SettingsStack.Navigator>
  )
}
