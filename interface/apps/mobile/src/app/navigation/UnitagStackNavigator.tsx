import { createStackNavigator, TransitionPresets } from '@react-navigation/stack'
import { spacing } from '@universe/mycelium'
import { useSporeColors } from '@universe/mycelium/theme-hooks-compat'
import { renderHeaderBackImage } from 'src/app/navigation/components'
import { navStackOptions } from 'src/app/navigation/navStackOptions'
import { ClaimUnitagScreen } from 'src/features/unitags/ClaimUnitagScreen'
import { EditUnitagProfileScreen } from 'src/features/unitags/EditUnitagProfileScreen'
import { UnitagChooseProfilePicScreen } from 'src/features/unitags/UnitagChooseProfilePicScreen'
import { UnitagConfirmationScreen } from 'src/features/unitags/UnitagConfirmationScreen'
import { useAppInsets } from 'uniswap/src/hooks/useAppInsets'
import { UnitagScreens, type UnitagStackParamList } from 'uniswap/src/types/screens/mobile'

const UnitagStack = createStackNavigator<UnitagStackParamList>()

export function UnitagStackNavigator(): JSX.Element {
  const colors = useSporeColors()
  const insets = useAppInsets()

  return (
    <UnitagStack.Navigator>
      <UnitagStack.Group
        screenOptions={{
          headerMode: 'float',
          headerTitle: '',
          headerBackButtonDisplayMode: 'minimal',
          headerBackImage: renderHeaderBackImage,
          headerStatusBarHeight: insets.top + spacing.spacing8,
          headerTransparent: true,
          headerTintColor: colors.neutral2.val,
          headerLeftContainerStyle: { paddingLeft: spacing.spacing16 },
          headerRightContainerStyle: { paddingRight: spacing.spacing16 },
          ...TransitionPresets.SlideFromRightIOS,
        }}
      >
        <UnitagStack.Screen component={ClaimUnitagScreen} name={UnitagScreens.ClaimUnitag} />
        <UnitagStack.Screen
          component={UnitagChooseProfilePicScreen}
          name={UnitagScreens.ChooseProfilePicture}
          options={{ ...TransitionPresets.ModalFadeTransition }}
        />
        <UnitagStack.Screen
          component={UnitagConfirmationScreen}
          name={UnitagScreens.UnitagConfirmation}
          options={{ ...navStackOptions.noHeader, gestureEnabled: false }}
        />
        <UnitagStack.Screen
          component={EditUnitagProfileScreen}
          name={UnitagScreens.EditProfile}
          options={{ ...navStackOptions.noHeader, gestureEnabled: false }}
        />
      </UnitagStack.Group>
    </UnitagStack.Navigator>
  )
}
