import { RouteProp } from '@react-navigation/core'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import React from 'react'
import { OnboardingStackParamList } from 'src/app/navigation/types'
import { RestoreCloudBackupPasswordScreen } from 'src/screens/Import/RestoreCloudBackupPasswordScreen'
import { render } from 'src/test/test-utils'
import { ImportType } from 'uniswap/src/types/onboarding'
import { OnboardingScreens } from 'uniswap/src/types/screens/mobile'
import { AppPortalProvider } from 'wallet/src/providers/portal-provider'

const setOptionsSpy = vi.fn()
const routeProp = { params: {} } as RouteProp<OnboardingStackParamList, OnboardingScreens.RestoreCloudBackupPassword>
const restoreMnemonicRouteProp = { params: { importType: ImportType.RestoreMnemonic } } as RouteProp<
  OnboardingStackParamList,
  OnboardingScreens.RestoreCloudBackupPassword
>

describe(RestoreCloudBackupPasswordScreen, () => {
  it('renders correctly', () => {
    const tree = render(
      <AppPortalProvider>
        <RestoreCloudBackupPasswordScreen
          navigation={
            {
              getState: () => ({
                index: 0,
              }),
              setOptions: setOptionsSpy,
            } as unknown as NativeStackNavigationProp<
              OnboardingStackParamList,
              OnboardingScreens.RestoreCloudBackupPassword,
              undefined
            >
          }
          route={routeProp}
        />
      </AppPortalProvider>,
    ).toJSON()

    expect(tree).toMatchSnapshot()
  })

  it('renders the enter-recovery-phrase link when restoring a mnemonic', () => {
    const tree = render(
      <AppPortalProvider>
        <RestoreCloudBackupPasswordScreen
          navigation={
            {
              getState: () => ({
                index: 0,
              }),
              setOptions: setOptionsSpy,
            } as unknown as NativeStackNavigationProp<
              OnboardingStackParamList,
              OnboardingScreens.RestoreCloudBackupPassword,
              undefined
            >
          }
          route={restoreMnemonicRouteProp}
        />
      </AppPortalProvider>,
    ).toJSON()

    expect(tree).toMatchSnapshot()
  })
})
