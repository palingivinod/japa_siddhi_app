package com.japasiddhi

import android.app.ActivityManager
import android.content.Context
import com.google.firebase.messaging.RemoteMessage
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService

/**
 * Extends RN Firebase messaging so JS still receives events.
 * When FCM includes a `notification` payload, Android OS already shows the tray —
 * do not draw a second one. Custom largeIcon is only for rare data-only paths.
 */
class JapaFirebaseMessagingService : ReactNativeFirebaseMessagingService() {
  override fun onMessageReceived(message: RemoteMessage) {
    val hasSystemTray = message.notification != null
    if (!hasSystemTray && !isAppInForeground(applicationContext)) {
      try {
        JapaNotificationPresenter.show(applicationContext, message)
      } catch (ignored: Exception) {
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
