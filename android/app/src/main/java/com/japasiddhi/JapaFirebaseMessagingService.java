package com.japasiddhi;

import android.app.ActivityManager;
import android.content.Context;
import com.google.firebase.messaging.RemoteMessage;
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService;
import me.leolin.shortcutbadger.ShortcutBadger;
import java.util.List;
import java.util.Map;

/**
 * When FCM is data-only, draw the tray ourselves so we can set largeIcon
 * (full-color logo left of the text, like WhatsApp profile photo).
 */
public class JapaFirebaseMessagingService extends ReactNativeFirebaseMessagingService {
  @Override
  public void onMessageReceived(RemoteMessage message) {
    // 1. Always update launcher badge icon count if badge is provided in payload data
    try {
      Map<String, String> data = message.getData();
      int badgeCount = -1;
      if (data != null && data.containsKey("badge")) {
        try {
          badgeCount = Integer.parseInt(data.get("badge"));
        } catch (Exception ignored) {}
      } else if (data != null && data.containsKey("unreadCount")) {
        try {
          badgeCount = Integer.parseInt(data.get("unreadCount"));
        } catch (Exception ignored) {}
      }
      if (badgeCount > 0) {
        ShortcutBadger.applyCount(getApplicationContext(), badgeCount);
      } else if (badgeCount == 0) {
        ShortcutBadger.removeCount(getApplicationContext());
      }
    } catch (Exception ignored) {
      // Ignore badge errors on unsupported launchers
    }

    // If FCM already included a notification payload, the OS may show it —
    // skip our custom tray to avoid duplicates.
    boolean hasSystemTray = message.getNotification() != null;
    if (!hasSystemTray && !isAppInForeground(getApplicationContext())) {
      try {
        JapaNotificationPresenter.show(getApplicationContext(), message);
      } catch (Exception ignored) {
        // JS / default path may still help.
      }
    }
    super.onMessageReceived(message);
  }

  private boolean isAppInForeground(Context context) {
    ActivityManager am = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
    if (am == null) {
      return false;
    }
    List<ActivityManager.RunningAppProcessInfo> processes = am.getRunningAppProcesses();
    if (processes == null) {
      return false;
    }
    String packageName = context.getPackageName();
    for (ActivityManager.RunningAppProcessInfo process : processes) {
      if (process.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
          && packageName.equals(process.processName)) {
        return true;
      }
    }
    return false;
  }
}
