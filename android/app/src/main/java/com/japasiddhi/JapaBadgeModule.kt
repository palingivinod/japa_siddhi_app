package com.japasiddhi

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import me.leolin.shortcutbadger.ShortcutBadger

class JapaBadgeModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "JapaBadge"

  @ReactMethod
  fun setBadgeCount(count: Int, promise: Promise) {
    try {
      val safeCount = if (count > 0) count else 0
      if (safeCount > 0) {
        ShortcutBadger.applyCount(reactContext.applicationContext, safeCount)
      } else {
        ShortcutBadger.removeCount(reactContext.applicationContext)
      }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun clearBadge(promise: Promise) {
    try {
      ShortcutBadger.removeCount(reactContext.applicationContext)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }
}

