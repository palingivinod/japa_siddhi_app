import mysql from '../../database/mysql';
import {
  sendAiSensyCampaign,
  formatAiSensyMobile,
} from '../../services/aisensy.service';
import { deliverAdminNotification } from '../admin/adminNotification.service';

/**
 * Returns current date and time in Indian Standard Time (IST).
 */
export const getIstNow = (): {
  year: string;
  month: string;
  day: string;
  hour: number;
  minute: number;
  ymd: string;
} => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: parseInt(get('hour'), 10) || 0,
    minute: parseInt(get('minute'), 10) || 0,
    ymd: `${get('year')}-${get('month')}-${get('day')}`,
  };
};

/**
 * Returns tomorrow's date components in Indian Standard Time (IST).
 */
export const getTomorrowIst = (): {
  year: string;
  month: string;
  day: string;
  monthDayIso: string; // e.g. "11-04"
  monthDayIndian: string; // e.g. "04-11"
  fullDate: string; // e.g. "2026-11-04"
} => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(tomorrow);

  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  const month = get('month');
  const day = get('day');
  return {
    year: get('year'),
    month,
    day,
    monthDayIso: `${month}-${day}`,
    monthDayIndian: `${day}-${month}`,
    fullDate: `${get('year')}-${month}-${day}`,
  };
};

let tableReady = false;

/**
 * Ensures table automated_wishes_log exists.
 */
export const ensureWishesLogTable = async (): Promise<void> => {
  if (tableReady) return;
  const engine = mysql.getEngineName() || 'sqlite';
  try {
    if (engine === 'postgres') {
      await mysql.query(`
        CREATE TABLE IF NOT EXISTS automated_wishes_log (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          wish_type VARCHAR(50) NOT NULL,
          wish_date VARCHAR(20) NOT NULL,
          channel VARCHAR(20) NOT NULL DEFAULT 'ALL',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT uq_automated_wishes UNIQUE (user_id, wish_type, wish_date)
        )
      `);
    } else {
      await mysql.query(`
        CREATE TABLE IF NOT EXISTS automated_wishes_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          wish_type TEXT NOT NULL,
          wish_date TEXT NOT NULL,
          channel TEXT NOT NULL DEFAULT 'ALL',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (user_id, wish_type, wish_date)
        )
      `);
    }
    tableReady = true;
  } catch (err) {
    console.warn('[AdvanceBirthday] ensureWishesLogTable warning:', err);
  }
};

export interface AdvanceBirthdaySweepResult {
  executedAtIst: string;
  tomorrowIstDate: string;
  totalEligible: number;
  sentWhatsApp: number;
  sentInApp: number;
  errors: Array<{ userId: number; error: string }>;
  users: Array<{ id: number; name: string; phone: string }>;
}

/**
 * Sweeps for devotees whose birthday falls on tomorrow in IST
 * and sends both In-App Push notification and AiSensy WhatsApp wish.
 */
export const runAdvanceBirthdaySweep = async (options?: {
  dryRun?: boolean;
}): Promise<AdvanceBirthdaySweepResult> => {
  await ensureWishesLogTable();

  const istNow = getIstNow();
  const tomorrow = getTomorrowIst();
  const dryRun = Boolean(options?.dryRun);

  // Find all active users whose birthday matches tomorrow in IST
  // Supports both YYYY-MM-DD (standard) and DD-MM-YYYY (localized)
  const rows = await mysql.query<any[]>(
    `
    SELECT
      u.id,
      u.full_name AS fullName,
      u.mobile_number AS mobileNumber,
      u.mobile_country_code AS mobileCountryCode,
      u.firebase_uid AS firebaseUid,
      u.date_of_birth AS dateOfBirth
    FROM users u
    WHERE u.deleted_at IS NULL
      AND (
        (LENGTH(TRIM(u.date_of_birth)) >= 10 AND SUBSTR(TRIM(u.date_of_birth), 6, 5) = ?)
        OR (LENGTH(TRIM(u.date_of_birth)) >= 10 AND SUBSTR(TRIM(u.date_of_birth), 1, 5) = ?)
      )
      AND u.id NOT IN (
        SELECT user_id FROM automated_wishes_log
        WHERE wish_type = 'ADVANCE_BIRTHDAY' AND wish_date = ?
      )
    ORDER BY u.id ASC
    `,
    [tomorrow.monthDayIso, tomorrow.monthDayIndian, tomorrow.fullDate],
  );

  const eligibleUsers = rows || [];
  console.log(
    `[AdvanceBirthday] 7 PM IST Sweep for tomorrow (${tomorrow.fullDate}): Found ${eligibleUsers.length} eligible devotee(s).`,
  );

  if (dryRun || !eligibleUsers.length) {
    return {
      executedAtIst: `${istNow.ymd} ${String(istNow.hour).padStart(2, '0')}:${String(istNow.minute).padStart(2, '0')}`,
      tomorrowIstDate: tomorrow.fullDate,
      totalEligible: eligibleUsers.length,
      sentWhatsApp: 0,
      sentInApp: 0,
      errors: [],
      users: eligibleUsers.map((u: any) => ({
        id: u.id,
        name: u.fullName || 'Devotee',
        phone: u.mobileNumber || '',
      })),
    };
  }

  let sentWhatsApp = 0;
  let sentInApp = 0;
  const errors: Array<{ userId: number; error: string }> = [];

  for (const user of eligibleUsers) {
    const rawName = String(user.fullName || '').trim();
    const devoteeName =
      rawName && rawName.toLowerCase() !== 'devotee' ? rawName : 'Devotee';
    const greetingName =
      devoteeName === 'Devotee' ? 'Devotee' : `${devoteeName} garu`;

    // 1. In-App Notification (Stored in inbox + Instant FCM push banner)
    try {
      const inAppTitle = 'Advance Birthday Blessings 🌸';
      const inAppMessage =
        `Namaste ${greetingName} 🙏\n\n` +
        `🎂 Warm advance Happy Birthday wishes from Japasiddhi - Bilva Patra Trust! ✨\n\n` +
        `Tomorrow is your sacred birthday. May Lord Shiva's divine grace bestow good health, peace, longevity, and prosperity upon you and your family. 🕉️\n\n` +
        `On this auspicious occasion, if you wish to perform Anna Santarpana (Annadanam) for devotees, you can participate at ₹80/- per person (Count as per your wish).\n\n` +
        `📞 To perform Anna Santarpana or for details, please call or WhatsApp us:\n+91 9704701468\n\n` +
        `With Divine Blessings,\nTeam Japasiddhi - Bilva Patra Trust 🙏`;

      await deliverAdminNotification({
        title: inAppTitle,
        message: inAppMessage,
        target: 'all',
        userIds: [user.id],
        actionType: 'ADVANCE_BIRTHDAY',
        bypassHours: true,
      });
      sentInApp++;
    } catch (inAppErr: any) {
      console.warn(
        `[AdvanceBirthday] In-app notification failed for user ${user.id}:`,
        inAppErr?.message || inAppErr,
      );
      errors.push({ userId: user.id, error: `InApp: ${inAppErr?.message}` });
    }

    // 2. WhatsApp Message via AiSensy campaign "advance_birthday_wishes"
    try {
      const rawMobile = user.mobileNumber;
      const rawCountry = user.mobileCountryCode;
      const destination = formatAiSensyMobile(rawMobile, rawCountry);

      if (destination) {
        const waResult = await sendAiSensyCampaign({
          destination,
          userName: devoteeName,
          campaignName: 'advance_birthday_wishes',
          templateParams: [devoteeName],
        });

        if (waResult.success) {
          sentWhatsApp++;
        } else {
          console.warn(
            `[AdvanceBirthday] WhatsApp send failed for user ${user.id} (${destination}):`,
            waResult.error,
          );
          errors.push({
            userId: user.id,
            error: `WhatsApp: ${waResult.error}`,
          });
        }
      }
    } catch (waErr: any) {
      console.warn(
        `[AdvanceBirthday] WhatsApp exception for user ${user.id}:`,
        waErr?.message || waErr,
      );
      errors.push({ userId: user.id, error: `WhatsApp: ${waErr?.message}` });
    }

    // 3. Record in automated_wishes_log to guarantee NO duplicate sending
    try {
      const engine = mysql.getEngineName() || 'sqlite';
      if (engine === 'postgres') {
        await mysql.query(
          `
          INSERT INTO automated_wishes_log (user_id, wish_type, wish_date, channel)
          VALUES (?, 'ADVANCE_BIRTHDAY', ?, 'ALL')
          ON CONFLICT (user_id, wish_type, wish_date) DO NOTHING
          `,
          [user.id, tomorrow.fullDate],
        );
      } else {
        await mysql.query(
          `
          INSERT OR IGNORE INTO automated_wishes_log (user_id, wish_type, wish_date, channel)
          VALUES (?, 'ADVANCE_BIRTHDAY', ?, 'ALL')
          `,
          [user.id, tomorrow.fullDate],
        );
      }
    } catch (logErr: any) {
      console.warn(
        `[AdvanceBirthday] Failed to log wish for user ${user.id}:`,
        logErr?.message || logErr,
      );
    }
  }

  return {
    executedAtIst: `${istNow.ymd} ${String(istNow.hour).padStart(2, '0')}:${String(istNow.minute).padStart(2, '0')}`,
    tomorrowIstDate: tomorrow.fullDate,
    totalEligible: eligibleUsers.length,
    sentWhatsApp,
    sentInApp,
    errors,
    users: eligibleUsers.map((u: any) => ({
      id: u.id,
      name: u.fullName || 'Devotee',
      phone: u.mobileNumber || '',
    })),
  };
};

/**
 * Invoked by scheduler every minute: checks if it is 7:00 PM IST (19:00 IST).
 * When 19:00 IST arrives, triggers runAdvanceBirthdaySweep automatically.
 */
let lastSweptDay = '';
export const checkAndRunScheduledAdvanceBirthdaySweep = async (): Promise<void> => {
  const ist = getIstNow();

  // Run at 7:00 PM IST (19:00 IST). Allowed window: 19:00 - 19:10 IST.
  if (ist.hour === 19 && ist.minute >= 0 && ist.minute < 10) {
    if (lastSweptDay === ist.ymd) {
      return; // Already executed today's 7 PM IST sweep
    }
    lastSweptDay = ist.ymd;
    console.log(
      `[AdvanceBirthday Scheduler] Triggering automated 7:00 PM IST birthday sweep on ${ist.ymd}...`,
    );
    try {
      const result = await runAdvanceBirthdaySweep();
      console.log(
        `[AdvanceBirthday Scheduler] Sweep finished: ${result.sentInApp} in-app sent, ${result.sentWhatsApp} WhatsApp sent for tomorrow (${result.tomorrowIstDate}).`,
      );
    } catch (err) {
      console.error('[AdvanceBirthday Scheduler] Sweep error:', err);
    }
  }
};
