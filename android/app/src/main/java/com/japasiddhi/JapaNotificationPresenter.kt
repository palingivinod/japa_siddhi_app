package com.japasiddhi

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.RemoteMessage

/**
 * Shows tray notifications with:
 * - smallIcon: white silhouette (status bar requirement)
 * - largeIcon: full-color Bilva Patra logo (shade circle, like WhatsApp)
 */
object JapaNotificationPresenter {
  private const val CHANNEL_ID = "fcm_fallback_notification_channel"
  private const val CHANNEL_NAME = "Japa Siddhi Alerts"

  fun show(context: Context, message: RemoteMessage) {
    val payload = message.data
    val title =
      (message.notification?.title
          ?: payload["title"]
          ?: context.getString(R.string.app_name))
        .trim()
        .ifEmpty { context.getString(R.string.app_name) }
    val body =
      (message.notification?.body
          ?: payload["body"]
          ?: payload["message"]
          ?: "You have a new notification.")
        .trim()
        .ifEmpty { "You have a new notification." }

    ensureChannel(context)

    val launchIntent =
      Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        // Do not use name `data` here — Intent.data is the Uri property.
        for ((key, value) in payload) {
          putExtra(key, value)
        }
      }
    val pendingIntent =
      PendingIntent.getActivity(
        context,
        (System.currentTimeMillis() % Int.MAX_VALUE).toInt(),
        launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )

    val largeIcon =
      BitmapFactory.decodeResource(context.resources, R.drawable.ic_notification_large)

    val notification =
      NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(R.drawable.ic_notification)
        .setLargeIcon(largeIcon)
        .setContentTitle(title)
        .setContentText(body)
        .setStyle(NotificationCompat.BigTextStyle().bigText(body))
        .setColor(ContextCompat.getColor(context, R.color.notification_color))
        .setAutoCancel(true)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setDefaults(NotificationCompat.DEFAULT_ALL)
        .setContentIntent(pendingIntent)
        .build()

    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val id = (System.currentTimeMillis() % Int.MAX_VALUE).toInt()
    manager.notify(id, notification)
  }

  private fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_ID) != null) {
      return
    }
    val channel =
      NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Japa Siddhi alerts"
        enableVibration(true)
      }
    manager.createNotificationChannel(channel)
  }
}
