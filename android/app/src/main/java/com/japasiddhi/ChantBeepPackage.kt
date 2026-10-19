package com.japasiddhi

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ChantBeepPackage : ReactPackage {
  override fun createNativeModules(
    reactContext: ReactApplicationContext,
  ): List<NativeModule> =
    listOf(
      ChantBeepModule(reactContext),
      IntroVideoModule(reactContext),
      AppInfoModule(reactContext),
    )

  override fun createViewManagers(
    reactContext: ReactApplicationContext,
  ): List<ViewManager<*, *>> = emptyList()
}
