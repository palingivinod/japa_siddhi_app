import mysql from '../../database/mysql';
import {
  sendAiSensyCampaign,
  formatAiSensyMobile,
} from '../../services/aisensy.service';
import { deliverAdminNotification } from '../admin/adminNotification.service';
import appSettingsService from '../admin/appSettings.service';

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
    console.warn('[BirthdayAutomation] ensureWishesLogTable warning:', err);
  }
};

/**
 * Atomically claims a devotee wish slot in automated_wishes_log BEFORE sending.
 * Returns true if this process successfully claimed the slot.
 * Returns false if the devotee was already claimed/sent by another instance, process, or previous sweep.
 */
export const claimDevoteeWish = async (
  userId: number,
  wishType: 'TODAY_BIRTHDAY' | 'ADVANCE_BIRTHDAY',
  wishDate: string,
): Promise<boolean> => {
  const engine = mysql.getEngineName() || 'sqlite';
  try {
    if (engine === 'postgres') {
      const res = await mysql.query<any>(
        `
        INSERT INTO automated_wishes_log (user_id, wish_type, wish_date, channel)
        VALUES (?, ?, ?, 'ALL')
        ON CONFLICT (user_id, wish_type, wish_date) DO NOTHING
        `,
        [userId, wishType, wishDate],
      );
      return Number(res?.affectedRows || 0) > 0;
    } else {
      const res = await mysql.query<any>(
        `
        INSERT OR IGNORE INTO automated_wishes_log (user_id, wish_type, wish_date, channel)
        VALUES (?, ?, ?, 'ALL')
        `,
        [userId, wishType, wishDate],
      );
      return Number(res?.affectedRows || 0) > 0;
    }
  } catch (err: any) {
    console.warn(
      `[BirthdayAutomation] Failed to claim wish lock for user ${userId} (${wishType}/${wishDate}):`,
      err?.message || err,
    );
    return false;
  }
};

let isTodaySweepRunning = false;
let isAdvanceSweepRunning = false;

export interface BirthdaySweepResult {
  executedAtIst: string;
  targetIstDate: string;
  sweepType: 'TODAY_BIRTHDAY' | 'ADVANCE_BIRTHDAY';
  campaignName: string;
  totalEligible: number;
  sentWhatsApp: number;
  sentInApp: number;
  errors: Array<{ userId: number; error: string }>;
  users: Array<{ id: number; name: string; phone: string }>;
}

/**
 * 7:00 AM IST: Automated Birthday Sweep for TODAY's birthdays.
 * Uses AiSensy campaign: "all_birthday_wishes"
 * Has NO time restrictions (bypassHours: true).
 */
export const runTodayBirthdaySweep = async (options?: {
  dryRun?: boolean;
}): Promise<BirthdaySweepResult> => {
  await ensureWishesLogTable();

  const istNow = getIstNow();
  const monthDayIso = `${istNow.month}-${istNow.day}`;
  const monthDayIndian = `${istNow.day}-${istNow.month}`;
  const todayDate = istNow.ymd;
  const dryRun = Boolean(options?.dryRun);

  // Find all active users whose birthday matches TODAY in IST
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
        WHERE wish_type = 'TODAY_BIRTHDAY' AND wish_date = ?
      )
    ORDER BY u.id ASC
    `,
    [monthDayIso, monthDayIndian, todayDate],
  );

  const eligibleUsers = rows || [];
  console.log(
    `[TodayBirthday] 7:00 AM IST Sweep for today (${todayDate}): Found ${eligibleUsers.length} eligible devotee(s).`,
  );

  if (isTodaySweepRunning && !dryRun) {
    console.warn('[TodayBirthday] Sweep is already running. Skipping concurrent invocation.');
    return {
      executedAtIst: `${istNow.ymd} ${String(istNow.hour).padStart(2, '0')}:${String(istNow.minute).padStart(2, '0')}`,
      targetIstDate: todayDate,
      sweepType: 'TODAY_BIRTHDAY',
      campaignName: 'all_birthday_wishes',
      totalEligible: 0,
      sentWhatsApp: 0,
      sentInApp: 0,
      errors: [{ userId: 0, error: 'Sweep already in progress' }],
      users: [],
    };
  }

  if (dryRun || !eligibleUsers.length) {
    return {
      executedAtIst: `${istNow.ymd} ${String(istNow.hour).padStart(2, '0')}:${String(istNow.minute).padStart(2, '0')}`,
      targetIstDate: todayDate,
      sweepType: 'TODAY_BIRTHDAY',
      campaignName: 'all_birthday_wishes',
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

  isTodaySweepRunning = true;
  try {
    let sentWhatsApp = 0;
    let sentInApp = 0;
    const errors: Array<{ userId: number; error: string }> = [];

    for (const user of eligibleUsers) {
      // 0. ATOMIC DB CLAIM BEFORE SENDING:
      // Guarantees strictly ONE delivery even across concurrent instances, zero-downtime restarts, or multiple schedulers.
      const claimed = await claimDevoteeWish(user.id, 'TODAY_BIRTHDAY', todayDate);
      if (!claimed) {
        console.log(
          `[TodayBirthday] Devotee ${user.id} already claimed/sent for ${todayDate}. Skipping duplicate dispatch.`,
        );
        continue;
      }

      const rawName = String(user.fullName || '').trim();
      const devoteeName =
        rawName && rawName.toLowerCase() !== 'devotee' ? rawName : 'Devotee';
      const greetingName =
        devoteeName === 'Devotee' ? 'Devotee' : `${devoteeName} garu`;

      // 1. In-App Notification (Stored in inbox + Instant FCM push banner with NO time restrictions)
      try {
        const inAppTitle = 'Happy Birthday! 🎂🌸';
        const inAppMessage =
          `Namaste ${greetingName} 🙏\n\n` +
          `🎂 Happy Birthday wishes from Japasiddhi - Bilva Patra Trust! ✨\n` +
          `Today is your auspicious birthday. May Lord Shiva's divine grace bestow good health, peace, longevity, and prosperity upon you and your family. 🕉️\n\n` +
          `🌸 జన్మదిన దివ్య శ్లోకం:\n` +
          `జన్మదినమిదం అయి ప్రియసఖే |\n` +
          `శంతనోతు తే సర్వదా ముదమ్ ||\n` +
          `ప్రార్థయామహే భవ శతాయుషీ |\n` +
          `ఈశ్వరః సదా త్వాం చ రక్షతు ||\n` +
          `పుణ్యకర్మణా కీర్తిమర్జయ |\n` +
          `జీవనం తవ భవతు సార్థకమ్ ||\n\n` +
          `Janma-dinam-idam ayi priya sakhe,\n` +
          `Śaṁ tanotu te sarvadā mudam ||\n` +
          `Prārthayāmahe bhava śatāyuṣī,\n` +
          `Īśvaraḥ sadā tvāṁ ca rakṣatu ||\n` +
          `Puṇyakarmaṇā kīrtim-arjaya,\n` +
          `Jīvanaṁ tava bhavatu sārthakam ||\n\n` +
          `* ಜನ್ಮದಿನಮಿದಂ ಅಯಿ ಪ್ರಿಯ ಸಖೇ\n` +
          `* ಶಂತನೋತು ತೇ ಸರ್ವದಾ ಮುದಂ\n` +
          `* ಪ್ರಾರ್ಥಯಾಮಹೇ ಭವ ಶತಾಯುಷೀ\n` +
          `* ಈಶ್ವರಃ ಸದಾ ತ್ವಾಂ ಚ ರಕ್ಷತು\n` +
          `* ಪುಣ್ಯ ಕರ್ಮಣಾ ಕೀರ್ತಿಮರ್ಜಯ\n` +
          `* ಜೀವನಂ ತವ ಭವತು ಸಾರ್ಥಕಂ\n\n` +
          `🍲 Anna Santarpana (అన్న సంతర్పణ):\n` +
          `On your sacred birthday, if you wish to perform Anna Santarpana (Food Donation) for devotees, you can participate at ₹80/- per person (Count as per your wish).\n\n` +
          `📞 To perform Anna Santarpana or for details, please call:\n+91 9704701468\n\n` +
          `With Divine Blessings,\nTeam Japasiddhi - Bilva Patra Trust 🙏`;

        await deliverAdminNotification({
          title: inAppTitle,
          message: inAppMessage,
          target: 'all',
          userIds: [user.id],
          actionType: 'TODAY_BIRTHDAY',
          bypassHours: true, // MUST send at 6:00 AM with NO time restrictions
        });
        sentInApp++;
      } catch (inAppErr: any) {
        console.warn(
          `[TodayBirthday] In-app notification failed for user ${user.id}:`,
          inAppErr?.message || inAppErr,
        );
        errors.push({ userId: user.id, error: `InApp: ${inAppErr?.message}` });
      }

      // 2. WhatsApp Message via AiSensy campaign "all_birthday_wishes"
      try {
        const rawMobile = user.mobileNumber;
        const rawCountry = user.mobileCountryCode;
        const destination = formatAiSensyMobile(rawMobile, rawCountry);

        if (destination) {
          const waResult = await sendAiSensyCampaign({
            destination,
            userName: devoteeName,
            campaignName: 'all_birthday_wishes',
            templateParams: [devoteeName],
          });

          if (waResult.success) {
            sentWhatsApp++;
          } else {
            console.warn(
              `[TodayBirthday] WhatsApp send failed for user ${user.id} (${destination}):`,
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
          `[TodayBirthday] WhatsApp exception for user ${user.id}:`,
          waErr?.message || waErr,
        );
        errors.push({ userId: user.id, error: `WhatsApp: ${waErr?.message}` });
      }
    }

    return {
      executedAtIst: `${istNow.ymd} ${String(istNow.hour).padStart(2, '0')}:${String(istNow.minute).padStart(2, '0')}`,
      targetIstDate: todayDate,
      sweepType: 'TODAY_BIRTHDAY',
      campaignName: 'all_birthday_wishes',
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
  } finally {
    isTodaySweepRunning = false;
  }
};

/**
 * 7:00 PM IST: Automated Advance Birthday Sweep for TOMORROW's birthdays.
 * Uses AiSensy campaign: "advance_birthday_wishes"
 */
export const runAdvanceBirthdaySweep = async (options?: {
  dryRun?: boolean;
}): Promise<BirthdaySweepResult> => {
  await ensureWishesLogTable();

  const istNow = getIstNow();
  const tomorrow = getTomorrowIst();
  const dryRun = Boolean(options?.dryRun);

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
    `[AdvanceBirthday] 7:00 PM IST Sweep for tomorrow (${tomorrow.fullDate}): Found ${eligibleUsers.length} eligible devotee(s).`,
  );

  if (isAdvanceSweepRunning && !dryRun) {
    console.warn('[AdvanceBirthday] Sweep is already running. Skipping concurrent invocation.');
    return {
      executedAtIst: `${istNow.ymd} ${String(istNow.hour).padStart(2, '0')}:${String(istNow.minute).padStart(2, '0')}`,
      targetIstDate: tomorrow.fullDate,
      sweepType: 'ADVANCE_BIRTHDAY',
      campaignName: 'advance_birthday_wishes',
      totalEligible: 0,
      sentWhatsApp: 0,
      sentInApp: 0,
      errors: [{ userId: 0, error: 'Sweep already in progress' }],
      users: [],
    };
  }

  if (dryRun || !eligibleUsers.length) {
    return {
      executedAtIst: `${istNow.ymd} ${String(istNow.hour).padStart(2, '0')}:${String(istNow.minute).padStart(2, '0')}`,
      targetIstDate: tomorrow.fullDate,
      sweepType: 'ADVANCE_BIRTHDAY',
      campaignName: 'advance_birthday_wishes',
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

  isAdvanceSweepRunning = true;
  try {
    let sentWhatsApp = 0;
    let sentInApp = 0;
    const errors: Array<{ userId: number; error: string }> = [];

    for (const user of eligibleUsers) {
      // 0. ATOMIC DB CLAIM BEFORE SENDING:
      // Guarantees strictly ONE delivery even across concurrent instances, zero-downtime restarts, or multiple schedulers.
      const claimed = await claimDevoteeWish(user.id, 'ADVANCE_BIRTHDAY', tomorrow.fullDate);
      if (!claimed) {
        console.log(
          `[AdvanceBirthday] Devotee ${user.id} already claimed/sent for ${tomorrow.fullDate}. Skipping duplicate dispatch.`,
        );
        continue;
      }

      const rawName = String(user.fullName || '').trim();
      const devoteeName =
        rawName && rawName.toLowerCase() !== 'devotee' ? rawName : 'Devotee';
      const greetingName =
        devoteeName === 'Devotee' ? 'Devotee' : `${devoteeName} garu`;

      // 1. In-App Notification
      try {
        const inAppTitle = 'Advance Birthday Blessings 🌸';
        const inAppMessage =
          `Namaste ${greetingName} 🙏\n\n` +
          `🎂 Advance Happy Birthday wishes from Japasiddhi - Bilva Patra Trust! ✨\n\n` +
          `Tomorrow is your sacred birthday. May Lord Shiva's divine grace bestow good health, peace, longevity, and prosperity upon you and your family. 🕉️\n\n` +
          `On this auspicious occasion, if you wish to perform Anna Santarpana (Annadanam) for devotees, you can participate at ₹80/- per person (Count as per your wish).\n\n` +
          `📞 To perform Anna Santarpana or for details, please call:\n+91 9704701468\n\n` +
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
    }

    return {
      executedAtIst: `${istNow.ymd} ${String(istNow.hour).padStart(2, '0')}:${String(istNow.minute).padStart(2, '0')}`,
      targetIstDate: tomorrow.fullDate,
      sweepType: 'ADVANCE_BIRTHDAY',
      campaignName: 'advance_birthday_wishes',
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
  } finally {
    isAdvanceSweepRunning = false;
  }
};

/**
 * Background Scheduler Poller (invoked every minute):
 * 1. At 6:00 AM IST sharp: runs runTodayBirthdaySweep() using "all_birthday_wishes".
 * 2. At 7:00 PM IST (19:00 IST) sharp: runs runAdvanceBirthdaySweep() using "advance_birthday_wishes".
 *
 * Persists execution date in app_settings table to ensure zero duplicate sweeps even across
 * container restarts, zero-downtime rolling deploys, or multi-instance hosts.
 */
let lastSweptTodayDay = '';
let lastSweptAdvanceDay = '';

export const checkAndRunScheduledBirthdaySweeps = async (): Promise<void> => {
  const ist = getIstNow();

  // 1. 6:00 AM IST (window: 06:00 - 06:10 IST): Today's Birthday wishes
  if (ist.hour === 6 && ist.minute >= 0 && ist.minute < 10) {
    if (!isTodaySweepRunning && lastSweptTodayDay !== ist.ymd) {
      try {
        const persistedLast = await appSettingsService.getSetting(
          'birthday_sweep_last_today_ymd',
          '',
        );
        if (persistedLast === ist.ymd) {
          lastSweptTodayDay = ist.ymd;
        } else {
          lastSweptTodayDay = ist.ymd;
          await appSettingsService.setSetting('birthday_sweep_last_today_ymd', ist.ymd);
          console.log(
            `[Birthday Scheduler] Triggering 6:00 AM IST TODAY Birthday sweep for ${ist.ymd}...`,
          );
          const result = await runTodayBirthdaySweep();
          console.log(
            `[Birthday Scheduler] 6:00 AM sweep completed: ${result.sentInApp} in-app, ${result.sentWhatsApp} WhatsApp sent.`,
          );
        }
      } catch (err) {
        console.error('[Birthday Scheduler] 6:00 AM sweep error:', err);
      }
    }
  }

  // 2. 7:00 PM IST (window: 19:00 - 19:10 IST): Tomorrow's Advance Birthday wishes
  if (ist.hour === 19 && ist.minute >= 0 && ist.minute < 10) {
    if (!isAdvanceSweepRunning && lastSweptAdvanceDay !== ist.ymd) {
      try {
        const persistedLast = await appSettingsService.getSetting(
          'birthday_sweep_last_advance_ymd',
          '',
        );
        if (persistedLast === ist.ymd) {
          lastSweptAdvanceDay = ist.ymd;
        } else {
          lastSweptAdvanceDay = ist.ymd;
          await appSettingsService.setSetting('birthday_sweep_last_advance_ymd', ist.ymd);
          console.log(
            `[Birthday Scheduler] Triggering 7:00 PM IST ADVANCE Birthday sweep for ${ist.ymd}...`,
          );
          const result = await runAdvanceBirthdaySweep();
          console.log(
            `[Birthday Scheduler] 7:00 PM sweep completed: ${result.sentInApp} in-app, ${result.sentWhatsApp} WhatsApp sent.`,
          );
        }
      } catch (err) {
        console.error('[Birthday Scheduler] 7:00 PM sweep error:', err);
      }
    }
  }
};
