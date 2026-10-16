import { useQuery } from '@tanstack/react-query'
import { Flex, iconSizes, Loader } from '@universe/mycelium'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBiometricUnlockSetupMutation } from 'src/app/features/biometricUnlock/useBiometricUnlockSetupMutation'
import { OnboardingScreen } from 'src/app/features/onboarding/OnboardingScreen'
import { SettingsToggleRow } from 'src/app/features/settings/components/SettingsToggleRow'
import { builtInBiometricCapabilitiesQuery } from 'src/app/utils/device/builtInBiometricCapabilitiesQuery'
import Trace from 'uniswap/src/features/telemetry/Trace'
import { ExtensionOnboardingFlow, ExtensionOnboardingScreens } from 'uniswap/src/types/screens/extension'
import { logger } from 'utilities/src/logger/logger'
import { useEvent } from 'utilities/src/react/hooks'

export function BiometricUnlockSetUp({
  flow,
  password,
  onBack,
  onNext,
}: {
  flow: ExtensionOnboardingFlow
  password: string
  onBack?: () => void
  onNext: () => void
}): JSX.Element | null {
  const { t } = useTranslation()
  const [isToggleEnabled, setIsToggleEnabled] = useState(true)

  const { data: biometricCapabilities, isLoading: isLoadingBiometricCapabilities } = useQuery(
    builtInBiometricCapabilitiesQuery({ t }),
  )

  useEffect(() => {
    if (!isLoadingBiometricCapabilities && !biometricCapabilities?.hasBuiltInBiometricSensor) {
      // The user should never end up in this screen when the device doesn't have a built-in biometric sensor,
      // but if they do, we automatically advance to the next step.
      logger.error(new Error('Invalid render of `BiometricUnlockSetUp` when no built in biometric sensor found'), {
        tags: { file: 'BiometricUnlockSetUp.tsx', function: 'BiometricUnlockSetUp' },
      })
      onNext()
    }
  }, [isLoadingBiometricCapabilities, biometricCapabilities?.hasBuiltInBiometricSensor, onNext])

  const { mutate: setupBiometricUnlock } = useBiometricUnlockSetupMutation({
    onSuccess: onNext,
    // Automatically disable biometrics if there's an error to avoid the user getting stuck.
    onError: () => setIsToggleEnabled(false),
  })

  const onContinue = useEvent(() => {
    if (!isToggleEnabled) {
      onNext()
      return
    }
    setupBiometricUnlock(password)
  })

  const icon = biometricCapabilities?.hasBuiltInBiometricSensor ? (
    <biometricCapabilities.icon color="$neutral1" size="$icon.24" />
  ) : null

  return (
    <Trace logImpression properties={{ flow }} screen={ExtensionOnboardingScreens.SetUpBiometricUnlock}>
      <OnboardingScreen
        Icon={
          // Legacy Square's `size` variant maps one value onto width/height and their min/max twins.
          <Flex
            centered
            backgroundColor="$surface2"
            borderRadius="$rounded12"
            width={iconSizes.icon48}
            height={iconSizes.icon48}
            minWidth={iconSizes.icon48}
            maxWidth={iconSizes.icon48}
            minHeight={iconSizes.icon48}
            maxHeight={iconSizes.icon48}
          >
            {icon}
          </Flex>
        }
        nextButtonEnabled
        nextButtonText={t('common.button.continue')}
        subtitle={t('onboarding.extension.biometrics.subtitle.fingerprint')}
        title={
          biometricCapabilities
            ? t('onboarding.extension.biometrics.title', { biometricsMethod: biometricCapabilities.name })
            : undefined
        }
        onBack={onBack}
        onSubmit={onContinue}
      >
        {!biometricCapabilities ? (
          <Loader.Box />
        ) : (
          <Flex gap="$spacing16" py="$spacing24" width="100%">
            <SettingsToggleRow
              Icon={biometricCapabilities.icon}
              title={t('onboarding.extension.biometrics.title', { biometricsMethod: biometricCapabilities.name })}
              checked={isToggleEnabled}
              onCheckedChange={setIsToggleEnabled}
            />
          </Flex>
        )}
      </OnboardingScreen>
    </Trace>
  )
}
