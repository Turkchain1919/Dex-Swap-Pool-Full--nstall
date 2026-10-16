package com.uniswap

import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.concurrentReactEnabled
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.i18nmanager.I18nUtil
import expo.modules.ReactActivityDelegateWrapper
import com.zoontek.rnbootsplash.RNBootSplash;


class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String {
    return "Uniswap"
  }

  // Required for react-navigation to work on Android
  override fun onCreate(savedInstanceState: Bundle?) {
    RNBootSplash.init(this, R.style.AppTheme)

    super.onCreate(null);

    window.navigationBarColor = Color.TRANSPARENT

    if (Build.VERSION_CODES.Q <= Build.VERSION.SDK_INT) {
      window.isNavigationBarContrastEnforced = false
    }
    val sharedI18nUtilInstance = I18nUtil.getInstance()
    sharedI18nUtilInstance.allowRTL(applicationContext, false)
  }

  /**
   * expo-dev-launcher redirects away from this activity before ReactActivityDelegate has created
   * its ReactDelegate whenever the app is launched without a dev-client URL — which is what
   * `expo run:android` does. React Native then hits requireNonNull in
   * ReactActivityDelegate.onUserLeaveHint and crashes the debug build, which also leaves
   * expo-dev-launcher warning that the app crashed the next time it opens. There is no React
   * instance to hand the callback to at that point, so dropping it is safe. Release builds stub
   * out expo-dev-launcher, so the delegate always exists there and this never triggers.
   */
  override fun onUserLeaveHint() {
    try {
      super.onUserLeaveHint()
    } catch (e: NullPointerException) {
      Log.w("MainActivity", "Ignoring onUserLeaveHint before the React delegate was created", e)
    }
  }

  /**
   * Returns the instance of the [ReactActivityDelegate]. Here we use a util class [ ] which allows you to easily enable Fabric and Concurrent React
   * (aka React 18) with two boolean flags.
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate? {
    return ReactActivityDelegateWrapper(this, BuildConfig.IS_NEW_ARCHITECTURE_ENABLED, DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled))
  }
}
