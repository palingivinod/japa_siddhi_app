package com.japasiddhi

import android.app.ActivityManager
import android.content.Context
import com.google.firebase.messaging.RemoteMessage
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService

/**
 * Extends RN Firebase messaging so JS still receives events, but when the app is
 * not in the foreground we draw the tray ourselves with the full-color large icon.
 *
 * Requires data-only (or data+notification handled here only when data present)
 * Android FCM payloads so [onMessageReceived] runs while backgrounded.
 */
class JapaFirebaseMessagingService : ReactNativeFirebaseMessagingService() {
  override fun onMessageReceived(message: RemoteMessage) {
    if (!isAppInForeground(applicationContext)) {
      try {
        JapaNotificationPresenter.show(applicationContext, message)
      } catch (_: Exception) {
        // Fall through — JS / default path may still help.
      }
    }
    super.onMessageReceived(message)
  }

  private fun isAppInForeground(context: Context): Boolean {
    val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    val appProcesses = am.runningAppProcesses ?: return false
    val packageName = context.packageName
    for (process in appProcesses) {
      if (process.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND &&
        process.processName == packageName
      ) {
        return true
      }
    }
    return false
  }
}
