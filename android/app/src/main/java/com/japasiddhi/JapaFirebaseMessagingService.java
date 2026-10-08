package com.japasiddhi;

import android.app.ActivityManager;
import android.content.Context;
import com.google.firebase.messaging.RemoteMessage;
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService;
import java.util.List;

/**
 * When FCM is data-only, draw the tray ourselves so we can set largeIcon
 * (full-color logo left of the text, like WhatsApp profile photo).
 */
public class JapaFirebaseMessagingService extends ReactNativeFirebaseMessagingService {
  @Override
  public void onMessageReceived(RemoteMessage message) {
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
