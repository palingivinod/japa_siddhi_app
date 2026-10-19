package com.japasiddhi

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule

/** Exposes Android versionName / versionCode to JS (About App). */
class AppInfoModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AppInfo"

  override fun getConstants(): MutableMap<String, Any> =
    hashMapOf(
      "versionName" to BuildConfig.VERSION_NAME,
      "versionCode" to BuildConfig.VERSION_CODE,
    )
}
