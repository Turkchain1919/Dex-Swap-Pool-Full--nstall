import { Flex, iconSizes, Text } from '@universe/mycelium'
import { PapersText } from '@universe/mycelium/icons/PapersText'
import { Passkey } from '@universe/mycelium/icons/Passkey'
import { QrCode } from '@universe/mycelium/icons/QrCode'
import { WalletFilled } from '@universe/mycelium/icons/WalletFilled'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { OptionCard } from 'src/app/components/buttons/OptionCard'
import {
  InitiatePasskeyAuthLocationState,
  SelectImportMethodLocationState,
} from 'src/app/features/onboarding/import/types'
import { OnboardingScreen } from 'src/app/features/onboarding/OnboardingScreen'
import { OnboardingRoutes, TopLevelRoutes } from 'src/app/navigation/constants'
import { navigate } from 'src/app/navigation/state'
import Trace from 'uniswap/src/features/telemetry/Trace'
import { ExtensionOnboardingFlow, ExtensionOnboardingScreens } from 'uniswap/src/types/screens/extension'

export function SelectImportMethod(): JSX.Element {
  const { t } = useTranslation()
  const locationState = useLocation().state as SelectImportMethodLocationState | undefined

  const showErrorMessage = locationState?.showErrorMessage

  return (
    <Trace
      logImpression
      properties={{ flow: ExtensionOnboardingFlow.Import }}
      screen={ExtensionOnboardingScreens.SelectImportMethod}
    >
      <Flex gap="$spacing16">
        <OnboardingScreen
          Icon={
            <Flex
              centered
              backgroundColor="$surface2"
              borderRadius="$rounded12"
              height={iconSizes.icon48}
              width={iconSizes.icon48}
            >
              <WalletFilled color="$neutral1" size="$icon.24" />
            </Flex>
          }
          title={t('onboarding.import.selectMethod.title')}
          onBack={(): void => navigate(`/${TopLevelRoutes.Onboarding}`, { replace: true })}
        >
          <Flex gap="$spacing12" mt="$spacing24" width="100%">
            {showErrorMessage && (
              <Flex mb="$spacing8">
                <Text color="$statusCritical" variant="body3" textAlign="center" width="100%">
                  {t('onboarding.import.selectMethod.errorMessage')}
                </Text>
              </Flex>
            )}
            <OptionCard
              Icon={Passkey}
              title={t('nav.logIn.button')}
              subtitle={t('onboarding.import.selectMethod.passkey.subtitle')}
              onPress={(): void =>
                navigate(`/${TopLevelRoutes.Onboarding}/${OnboardingRoutes.ImportPasskey}`, {
                  replace: true,
                  state: { importPasskey: true } satisfies InitiatePasskeyAuthLocationState,
                })
              }
            />
            <OptionCard
              Icon={PapersText}
              title={t('onboarding.import.selectMethod.recoveryPhrase.title')}
              subtitle={t('onboarding.import.selectMethod.recoveryPhrase.subtitle')}
              onPress={(): void =>
                navigate(`/${TopLevelRoutes.Onboarding}/${OnboardingRoutes.Import}`, { replace: true })
              }
            />
            <OptionCard
              Icon={QrCode}
              title={t('onboarding.import.selectMethod.mobileApp.title')}
              subtitle={t('onboarding.import.selectMethod.mobileApp.subtitle')}
              onPress={(): void =>
                navigate(`/${TopLevelRoutes.Onboarding}/${OnboardingRoutes.Scan}`, { replace: true })
              }
            />
          </Flex>
        </OnboardingScreen>
      </Flex>
    </Trace>
  )
}
