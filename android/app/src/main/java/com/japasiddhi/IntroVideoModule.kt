package com.japasiddhi

import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class IntroVideoModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "IntroVideo"

  @ReactMethod
  fun play(url: String, promise: Promise) {
    try {
      if (url.isBlank()) {
        promise.reject("E_URL", "Video URL is empty")
        return
      }
      val intent =
        Intent(reactContext, IntroVideoActivity::class.java).apply {
          putExtra(IntroVideoActivity.EXTRA_URL, url)
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_PLAY", e.message, e)
    }
  }
}
