package com.japasiddhi;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.Person;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.drawable.IconCompat;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

/**
 * WhatsApp-style tray: full-color logo on the LEFT of the text.
 *
 * Tap opens japasiddhi://notify?... so React Native Linking can deep-link
 * (FCM open handlers do not fire for our custom PendingIntent).
 */
public final class JapaNotificationPresenter {
  private static final String CHANNEL_ID = "fcm_fallback_notification_channel";
  private static final String CHANNEL_NAME = "Japa Siddhi Alerts";

  private JapaNotificationPresenter() {}

  public static void show(Context context, RemoteMessage message) {
    Map<String, String> data = message.getData();
    String title =
        firstNonEmpty(
            message.getNotification() != null ? message.getNotification().getTitle() : null,
            data.get("title"),
            context.getString(R.string.app_name));
    String body =
        firstNonEmpty(
            message.getNotification() != null ? message.getNotification().getBody() : null,
            data.get("body"),
            data.get("message"),
            "You have a new notification.");

    ensureChannel(context);

    Uri deepLink = buildNotifyUri(data, title, body);
    Intent launchIntent = new Intent(Intent.ACTION_VIEW, deepLink);
    launchIntent.setClass(context, MainActivity.class);
    launchIntent.setFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK
            | Intent.FLAG_ACTIVITY_CLEAR_TOP
            | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    for (Map.Entry<String, String> entry : data.entrySet()) {
      launchIntent.putExtra(entry.getKey(), entry.getValue());
    }

    PendingIntent pendingIntent =
        PendingIntent.getActivity(
            context,
            (int) (System.currentTimeMillis() % Integer.MAX_VALUE),
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

    Bitmap logoBitmap =
        BitmapFactory.decodeResource(context.getResources(), R.drawable.ic_notification_large);
    IconCompat logoIcon = IconCompat.createWithBitmap(logoBitmap);

    Person brandPerson =
        new Person.Builder()
            .setName(title)
            .setIcon(logoIcon)
            .setImportant(true)
            .build();

    NotificationCompat.MessagingStyle style =
        new NotificationCompat.MessagingStyle(brandPerson)
            .setGroupConversation(false)
            .addMessage(body, System.currentTimeMillis(), brandPerson);

    NotificationCompat.Builder builder =
        new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(style)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setColor(ContextCompat.getColor(context, R.color.notification_color))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setContentIntent(pendingIntent);

    // Do NOT also setLargeIcon — that is what OEMs pin to the right.
    NotificationManager manager =
        (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager != null) {
      manager.notify((int) (System.currentTimeMillis() % Integer.MAX_VALUE), builder.build());
    }
  }

  /** japasiddhi://notify?actionType=...&mantraId=... */
  private static Uri buildNotifyUri(Map<String, String> data, String title, String body) {
    Uri.Builder builder =
        new Uri.Builder().scheme("japasiddhi").authority("notify");
    if (data != null) {
      for (Map.Entry<String, String> entry : data.entrySet()) {
        String key = entry.getKey();
        String value = entry.getValue();
        if (key == null || value == null) {
          continue;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
          continue;
        }
        // Keep URI short; body text is not needed for routing.
        if ("body".equals(key) || "message".equals(key) || "pushBody".equals(key)) {
          continue;
        }
        builder.appendQueryParameter(key, trimmed);
      }
    }
    if (title != null && !title.trim().isEmpty() && (data == null || !data.containsKey("title"))) {
      builder.appendQueryParameter("title", title.trim());
    }
    return builder.build();
  }

  private static String firstNonEmpty(String... values) {
    if (values == null) {
      return "";
    }
    for (String value : values) {
      if (value != null) {
        String trimmed = value.trim();
        if (!trimmed.isEmpty()) {
          return trimmed;
        }
      }
    }
    return "";
  }

  private static void ensureChannel(Context context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return;
    }
    NotificationManager manager =
        (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) {
      return;
    }
    NotificationChannel channel =
        new NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH);
    channel.setDescription("Japa Siddhi alerts");
    channel.enableVibration(true);
    manager.createNotificationChannel(channel);
  }
}
