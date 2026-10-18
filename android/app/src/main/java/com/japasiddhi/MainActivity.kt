package com.japasiddhi

import android.content.Intent
import android.os.Bundle
import android.view.WindowManager
import androidx.core.view.WindowCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "JapaSiddhi"

  override fun onCreate(savedInstanceState: Bundle?) {
    // targetSdk 35+/36 can force edge-to-edge; keep classic system-window fit so
    // keyboard / IME behaviour stays stable across Android brands.
    WindowCompat.setDecorFitsSystemWindows(window, true)
    // Prefer pan over resize — resize + ScrollView has crashed on many Android devices.
    window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN)
    super.onCreate(savedInstanceState)
    // Re-apply after RN Activity setup — some devices reset soft-input during super.onCreate.
    WindowCompat.setDecorFitsSystemWindows(window, true)
    window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN)
  }

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  /** singleTask: forward tray deep-link URIs to React Native Linking. */
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
  }
}
