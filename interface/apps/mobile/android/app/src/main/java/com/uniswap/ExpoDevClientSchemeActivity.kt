package com.uniswap

import android.app.Activity
import android.content.Intent
import android.os.Bundle

/**
 * Trampoline so Expo can discover the `uniswap` URL scheme.
 *
 * `@expo/config-plugins` only reads schemes from activities with
 * `launchMode="singleTask"` (and only from `src/main/AndroidManifest.xml`).
 * MainActivity is deliberately `singleTop` (Google Sign-In / Drive restore), so
 * without this activity `expo run:android` cannot build a
 * `uniswap://expo-development-client/?url=…` deep link and opens the app with
 * no Metro URL.
 *
 * The manifest declares this activity as `android:enabled="false"`, so it never runs: the
 * declaration is what Expo reads, and MainActivity's own `uniswap` filter already accepts the
 * dev-client URL. The forwarding below only matters if the component is ever re-enabled.
 */
class ExpoDevClientSchemeActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // setFlags, not addFlags: the forwarded flags must not depend on how the intent arrived.
    // NEW_TASK is required — the application sets android:taskAffinity="", so this singleTask
    // activity always roots a fresh task. Without it MainActivity would be stacked into that
    // fresh task (a second instance) instead of reaching the running one via onNewIntent.
    startActivity(
      Intent(intent).setClass(this, MainActivity::class.java).setFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP,
      ),
    )
    finish()
  }
}
