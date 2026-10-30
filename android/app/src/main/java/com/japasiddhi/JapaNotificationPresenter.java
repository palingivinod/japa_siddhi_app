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
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;

/**
 * Tray notification: brand logo on the left by default. When FCM data includes
 * imageUrl, download that picture and show BigPictureStyle so devotees see the
 * reward / promo image in the popup (not a link).
 *
 * Tap opens japasiddhi://notify?... so React Native Linking can deep-link.
 */
public final class JapaNotificationPresenter {
  private static final String CHANNEL_ID = "fcm_fallback_notification_channel";
  private static final String CHANNEL_NAME = "Japa Siddhi Alerts";
  private static final int MAX_IMAGE_BYTES = 2 * 1024 * 1024;

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
    String imageUrl =
        firstNonEmpty(
            data != null ? data.get("imageUrl") : null,
            data != null ? data.get("image") : null,
            message.getNotification() != null && message.getNotification().getImageUrl() != null
                ? message.getNotification().getImageUrl().toString()
                : null);

    ensureChannel(context);

    Uri deepLink = buildNotifyUri(data, title, body);
    Intent launchIntent = new Intent(Intent.ACTION_VIEW, deepLink);
    launchIntent.setClass(context, MainActivity.class);
    launchIntent.setFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK
            | Intent.FLAG_ACTIVITY_CLEAR_TOP
            | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    if (data != null) {
      for (Map.Entry<String, String> entry : data.entrySet()) {
        launchIntent.putExtra(entry.getKey(), entry.getValue());
      }
    }

    PendingIntent pendingIntent =
        PendingIntent.getActivity(
            context,
            (int) (System.currentTimeMillis() % Integer.MAX_VALUE),
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

    Bitmap logoBitmap =
        BitmapFactory.decodeResource(context.getResources(), R.drawable.ic_notification_large);
    Bitmap remoteBitmap = downloadBitmap(imageUrl);

    NotificationCompat.Builder builder =
        new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setCategory(
                remoteBitmap != null
                    ? NotificationCompat.CATEGORY_PROMO
                    : NotificationCompat.CATEGORY_MESSAGE)
            .setColor(ContextCompat.getColor(context, R.color.notification_color))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setContentIntent(pendingIntent);

    if (remoteBitmap != null) {
      NotificationCompat.BigPictureStyle bigStyle =
          new NotificationCompat.BigPictureStyle()
              .bigPicture(remoteBitmap)
              .setBigContentTitle(title)
              .setSummaryText(body);
      // Hide the right-side large icon when expanded so the photo dominates.
      bigStyle.bigLargeIcon((Bitmap) null);
      builder.setStyle(bigStyle).setLargeIcon(remoteBitmap);
    } else {
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
      builder.setStyle(style);
      // Do NOT also setLargeIcon — that is what OEMs pin to the right.
    }

    NotificationManager manager =
        (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager != null) {
      manager.notify((int) (System.currentTimeMillis() % Integer.MAX_VALUE), builder.build());
    }
  }

  private static Bitmap downloadBitmap(String imageUrl) {
    if (imageUrl == null || imageUrl.trim().isEmpty()) {
      return null;
    }
    String urlText = imageUrl.trim();
    if (!urlText.startsWith("https://") && !urlText.startsWith("http://")) {
      return null;
    }
    HttpURLConnection connection = null;
    InputStream stream = null;
    try {
      URL url = new URL(urlText);
      connection = (HttpURLConnection) url.openConnection();
      connection.setConnectTimeout(8000);
      connection.setReadTimeout(12000);
      connection.setInstanceFollowRedirects(true);
      connection.connect();
      int code = connection.getResponseCode();
      if (code < 200 || code >= 300) {
        return null;
      }
      int length = connection.getContentLength();
      if (length > MAX_IMAGE_BYTES) {
        return null;
      }
      stream = connection.getInputStream();
      BitmapFactory.Options options = new BitmapFactory.Options();
      options.inPreferredConfig = Bitmap.Config.ARGB_8888;
      Bitmap decoded = BitmapFactory.decodeStream(stream, null, options);
      if (decoded == null) {
        return null;
      }
      // Keep tray memory reasonable on low-end devices.
      int maxEdge = 1280;
      int w = decoded.getWidth();
      int h = decoded.getHeight();
      if (w > maxEdge || h > maxEdge) {
        float scale = Math.min((float) maxEdge / w, (float) maxEdge / h);
        int nw = Math.max(1, Math.round(w * scale));
        int nh = Math.max(1, Math.round(h * scale));
        Bitmap scaled = Bitmap.createScaledBitmap(decoded, nw, nh, true);
        if (scaled != decoded) {
          decoded.recycle();
        }
        return scaled;
      }
      return decoded;
    } catch (Exception ignored) {
      return null;
    } finally {
      try {
        if (stream != null) {
          stream.close();
        }
      } catch (Exception ignored) {
      }
      if (connection != null) {
        connection.disconnect();
      }
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
        // Keep URI short; body / image URLs are not needed for routing.
        if ("body".equals(key)
            || "message".equals(key)
            || "pushBody".equals(key)
            || "imageUrl".equals(key)
            || "image".equals(key)) {
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
