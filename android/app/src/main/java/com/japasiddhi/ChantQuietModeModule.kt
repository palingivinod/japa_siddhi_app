package com.japasiddhi

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * While chanting: request Do Not Disturb access and silence interruptions.
 * On leave / app close: restore the previous interruption filter.
 */
class ChantQuietModeModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  companion object {
    private const val TAG = "ChantQuietMode"
    private const val PREFS = "chant_quiet_mode"
    private const val KEY_PREV_FILTER = "prev_filter"
    private const val KEY_ACTIVE = "quiet_active"
  }

  override fun getName(): String = "ChantQuietMode"

  private fun nm(): NotificationManager? =
    reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager

  private fun prefs() =
    reactContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  @ReactMethod
  fun isSupported(promise: Promise) {
    promise.resolve(Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
  }

  @ReactMethod
  fun hasAccess(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
        promise.resolve(false)
        return
      }
      promise.resolve(nm()?.isNotificationPolicyAccessGranted == true)
    } catch (e: Exception) {
      Log.w(TAG, "hasAccess failed", e)
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun openAccessSettings(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
        promise.resolve(false)
        return
      }
      val intent =
        Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      Log.w(TAG, "openAccessSettings failed", e)
      promise.reject("E_SETTINGS", e.message, e)
    }
  }

  @ReactMethod
  fun enableQuietMode(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
        promise.resolve(false)
        return
      }
      val manager = nm()
      if (manager == null || !manager.isNotificationPolicyAccessGranted) {
        promise.resolve(false)
        return
      }
      val store = prefs()
      if (!store.getBoolean(KEY_ACTIVE, false)) {
        store
          .edit()
          .putInt(KEY_PREV_FILTER, manager.currentInterruptionFilter)
          .putBoolean(KEY_ACTIVE, true)
          .apply()
      }
      // Strong silence for chanting (notifications + most calls, OEM-dependent).
      manager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_NONE)
      promise.resolve(true)
    } catch (e: Exception) {
      Log.w(TAG, "enableQuietMode failed", e)
      promise.reject("E_ENABLE", e.message, e)
    }
  }

  @ReactMethod
  fun disableQuietMode(promise: Promise) {
    try {
      restoreQuietModeInternal()
      promise.resolve(true)
    } catch (e: Exception) {
      Log.w(TAG, "disableQuietMode failed", e)
      promise.reject("E_DISABLE", e.message, e)
    }
  }

  private fun restoreQuietModeInternal() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      return
    }
    val manager = nm() ?: return
    val store = prefs()
    if (!store.getBoolean(KEY_ACTIVE, false)) {
      return
    }
    if (!manager.isNotificationPolicyAccessGranted) {
      store.edit().putBoolean(KEY_ACTIVE, false).apply()
      return
    }
    val previous =
      store.getInt(
        KEY_PREV_FILTER,
        NotificationManager.INTERRUPTION_FILTER_ALL,
      )
    try {
      manager.setInterruptionFilter(previous)
    } catch (e: Exception) {
      Log.w(TAG, "restore filter failed", e)
      try {
        manager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
      } catch (_: Exception) {
        // ignore
      }
    }
    store.edit().putBoolean(KEY_ACTIVE, false).apply()
  }

  override fun invalidate() {
    try {
      restoreQuietModeInternal()
    } catch (_: Exception) {
      // ignore
    }
    super.invalidate()
  }
}
