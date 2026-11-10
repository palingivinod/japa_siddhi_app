import appSettingsService from './appSettings.service';
import {deliverAdminNotification} from './adminNotification.service';
import mysql from '../../database/mysql';
import {ResultSetHeader} from 'mysql2';

const nowIstStamp = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find(part => part.type === type)?.value || '00';
  let hour = get('hour');
  if (hour === '24') hour = '00';
  return `${get("year")}-${get("month")}-${get("day")} ${hour}:${get("minute")}:${get("second")}`;
};

const deliverMeetingNotificationWithAnalytics = async (input: {
  title: string;
  message: string;
  actionType: 'MEETING_SCHEDULED' | 'MEETING_LIVE';
  extraData?: Record<string, any>;
  bypassHours?: boolean;
  target?: string;
}) => {
  let queueId = 0;
  const now = nowIstStamp();
  try {
    const queueInsert = await mysql.query<ResultSetHeader>(
      `
      INSERT INTO admin_notification_queue (
        title, message, target_group, category, action_type, send_at, status, recipient_count, created_at
      ) VALUES (?, ?, 'all', 'general', ?, ?, 'SENDING', 0, ?)
      `,
      [input.title, input.message, input.actionType, now, now],
    );
    queueId = Number(
      (queueInsert as any)?.insertId ?? (queueInsert as any)?.id ?? 0,
    );
  } catch (err) {
    console.warn('Meeting notification queue insert failed:', err);
  }

  const delivered = await deliverAdminNotification({
    title: input.title,
    message: input.message,
    target: 'all',
    actionType: input.actionType,
    extraData: {
      ...(input.extraData || {}),
      ...(queueId ? {broadcastId: queueId, queuedId: queueId} : {}),
    },
    bypassHours: input.bypassHours ?? false,
  });

  if (queueId) {
    try {
      await mysql.query(
        `
        UPDATE admin_notification_queue
        SET status = 'SENT',
            recipient_count = ?,
            processed_at = ?
        WHERE id = ?
        `,
        [delivered.recipientCount, now, queueId],
      );
    } catch (err) {
      console.warn('Meeting notification queue update failed:', err);
    }
  }

  return delivered;
};

const SCHEDULE_FP_KEY = 'meeting_schedule_notify_fp';
const LIVE_FP_KEY = 'meeting_live_notify_fp';

/** Live-start window: notify once from start until 3 hours later. */
const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

type MeetingLike = {
  enabled?: boolean;
  title?: string;
  link?: string;
  time?: string;
  scheduledAt?: string | null;
};

const formatIstLabel = (isoOrText: string) => {
  const ms = new Date(isoOrText).getTime();
  if (!Number.isFinite(ms) || ms <= 0) {
    return String(isoOrText || '').trim();
  }
  try {
    return new Date(ms).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(isoOrText || '').trim();
  }
};

const resolveStartMs = (meeting: MeetingLike): number | null => {
  if (meeting.scheduledAt) {
    const ms = new Date(String(meeting.scheduledAt)).getTime();
    if (Number.isFinite(ms) && ms > 0) {
      return ms;
    }
  }
  return null;
};

const scheduleFingerprint = (meeting: MeetingLike) => {
  const title = String(meeting.title || '').trim();
  const link = String(meeting.link || '').trim();
  const scheduledAt = meeting.scheduledAt
    ? String(meeting.scheduledAt)
    : '';
  const time = String(meeting.time || '').trim();
  return [
    meeting.enabled ? '1' : '0',
    title,
    link,
    scheduledAt || time,
  ].join('|');
};

const liveFingerprint = (meeting: MeetingLike) => {
  const startMs = resolveStartMs(meeting);
  const title = String(meeting.title || '').trim();
  const link = String(meeting.link || '').trim();
  if (startMs) {
    return `${startMs}|${title}|${link}`;
  }
  // Immediate live (no scheduledAt): key by title+link+day so re-saves same day don't spam.
  const day = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  });
  return `immediate|${day}|${title}|${link}`;
};

/**
 * After admin saves an enabled meeting: notify all users once per schedule change.
 * Future start → "scheduled" message. Already live / no clock → "live" message.
 */
export const notifyMeetingSaved = async (meeting: MeetingLike) => {
  if (!meeting?.enabled || !String(meeting.link || '').trim()) {
    return {sent: false, reason: 'disabled_or_no_link'};
  }

  const fp = scheduleFingerprint(meeting);
  const prev = await appSettingsService.getSetting(SCHEDULE_FP_KEY, '');
  if (prev === fp) {
    return {sent: false, reason: 'already_notified'};
  }

  const title = String(meeting.title || '').trim() || 'Online Class';
  const startMs = resolveStartMs(meeting);
  const now = Date.now();
  const timeLabel =
    (startMs
      ? formatIstLabel(new Date(startMs).toISOString())
      : String(meeting.time || '').trim()) || 'the announced time';

  const isFuture = Boolean(startMs && startMs > now + 30_000);

  try {
    if (isFuture) {
      await deliverMeetingNotificationWithAnalytics({
        title: 'Class scheduled',
        message: `${title} is scheduled for ${timeLabel}. Open Home to see the countdown.`,
        target: 'all',
        actionType: 'MEETING_SCHEDULED',
        extraData: {screen: 'Home', meetingTitle: title},
        // Class schedules should popup like LIVE — don't drop FCM in quiet hours.
        bypassHours: true,
      });
      // New schedule → allow a fresh live-start push later.
      await appSettingsService.setSetting(LIVE_FP_KEY, '');
    } else {
      const liveFp = liveFingerprint(meeting);
      await appSettingsService.setSetting(LIVE_FP_KEY, liveFp);
      await deliverMeetingNotificationWithAnalytics({
        title: `${title} is LIVE`,
        message: `Join now from the Home screen.`,
        actionType: 'MEETING_LIVE',
        extraData: {screen: 'Home', meetingTitle: title},
        bypassHours: true,
      });
    }
    await appSettingsService.setSetting(SCHEDULE_FP_KEY, fp);
    return {sent: true, kind: isFuture ? 'scheduled' : 'live'};
  } catch (error) {
    console.warn('Meeting schedule notify failed:', error);
    return {sent: false, reason: 'error'};
  }
};

/**
 * Poller: when scheduled meeting start time is reached, notify all users once.
 */
export const checkAndNotifyMeetingLive = async () => {
  try {
    const meeting = await appSettingsService.getMeetingConfig();
    if (!meeting.enabled || !String(meeting.link || '').trim()) {
      return {sent: false, reason: 'disabled_or_no_link'};
    }

    const startMs = resolveStartMs(meeting);
    if (!startMs) {
      return {sent: false, reason: 'no_scheduled_at'};
    }

    const now = Date.now();
    if (now < startMs) {
      return {sent: false, reason: 'not_started'};
    }
    if (now - startMs > LIVE_WINDOW_MS) {
      return {sent: false, reason: 'window_passed'};
    }

    const fp = liveFingerprint(meeting);
    const prev = await appSettingsService.getSetting(LIVE_FP_KEY, '');
    if (prev === fp) {
      return {sent: false, reason: 'already_notified'};
    }

    // Claim before send so overlapping 60s pollers / multi-instance hosts
    // cannot fire the same LIVE push twice.
    await appSettingsService.setSetting(LIVE_FP_KEY, fp);

    const title = String(meeting.title || '').trim() || 'Online Class';
    try {
      await deliverMeetingNotificationWithAnalytics({
        title: `${title} is LIVE`,
        message: `Join now from the Home screen.`,
        actionType: 'MEETING_LIVE',
        extraData: {screen: 'Home', meetingTitle: title},
        bypassHours: true,
      });
    } catch (error) {
      // Allow a retry on the next poll if delivery failed.
      await appSettingsService.setSetting(LIVE_FP_KEY, '');
      throw error;
    }
    return {sent: true};
  } catch (error) {
    console.warn('Meeting live notify failed:', error);
    return {sent: false, reason: 'error'};
  }
};

export const clearMeetingNotifyKeys = async () => {
  await appSettingsService.setSetting(SCHEDULE_FP_KEY, '');
  await appSettingsService.setSetting(LIVE_FP_KEY, '');
};
