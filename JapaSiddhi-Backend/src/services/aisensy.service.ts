import environment from '../config/environment';
import mysql from '../database/mysql';
import {isPlaceholderMobile} from '../modules/auth/auth.repository';

const AISENSY_API_URL = 'https://backend.aisensy.com/campaign/t1/api/v2';

/**
 * Format mobile number to international digits without '+' or spaces.
 * Defaults to country code '91' for 10-digit Indian numbers.
 */
export const formatAiSensyMobile = (
  mobileNumber?: string | null,
  countryCode?: string | null,
): string => {
  if (!mobileNumber) {
    return '';
  }
  let digits = String(mobileNumber).replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  // Strip leading zeros if 11 digits (e.g. 09876543210 -> 9876543210)
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Standard 10-digit Indian number
  if (digits.length === 10) {
    const cc = String(countryCode || '91').replace(/\D/g, '') || '91';
    return `${cc}${digits}`;
  }

  // Already 12-digit Indian number starting with 91
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }

  // If country code is explicitly given and not in digits
  if (countryCode) {
    const cc = String(countryCode).replace(/\D/g, '');
    if (cc && !digits.startsWith(cc)) {
      return `${cc}${digits}`;
    }
  }

  return digits.length >= 10 ? digits : '';
};

export interface SendAiSensyInput {
  destination: string;
  userName?: string;
  campaignName: string;
  templateParams: string[];
  media?: {
    url?: string;
    filename?: string;
  };
}

export interface SendAiSensyResult {
  success: boolean;
  destination: string;
  data?: any;
  error?: string;
}

/**
 * Sends a single WhatsApp message via AiSensy Campaign API.
 */
export const sendAiSensyCampaign = async (
  input: SendAiSensyInput,
): Promise<SendAiSensyResult> => {
  const apiKey = String(environment.AISENSY_API_KEY || '').trim();
  if (!apiKey) {
    console.warn('⚠️ AiSensy API Key is missing. Skipping WhatsApp message.');
    return {
      success: false,
      destination: input.destination,
      error: 'AiSensy API Key not configured',
    };
  }

  if (!input.destination) {
    return {
      success: false,
      destination: '',
      error: 'Invalid or missing mobile number',
    };
  }

  const payload: Record<string, any> = {
    apiKey,
    campaignName: input.campaignName,
    destination: input.destination,
    userName: input.userName || 'Devotee',
    templateParams: input.templateParams,
    source: 'api',
  };

  if (input.media?.url) {
    payload.media = input.media;
  }

  try {
    const response = await fetch(AISENSY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const resJson: any = await response.json().catch(() => null);

    if (!response.ok || (resJson && resJson.success === false)) {
      const errMsg =
        resJson?.message ||
        resJson?.error ||
        `HTTP error ${response.status}: ${response.statusText}`;
      console.warn(`[AiSensy] Failed to send to ${input.destination}:`, errMsg);
      return {
        success: false,
        destination: input.destination,
        error: errMsg,
      };
    }

    return {
      success: true,
      destination: input.destination,
      data: resJson,
    };
  } catch (error: any) {
    console.error(`[AiSensy] Request exception for ${input.destination}:`, error?.message || error);
    return {
      success: false,
      destination: input.destination,
      error: error?.message || 'AiSensy network exception',
    };
  }
};

/**
 * Batch sends Birthday WhatsApp wishes to devotees via AiSensy.
 * Matches approved template:
 * Namaste {{1}} 🙏
 * *{{2}}*
 * {{3}}
 * — Sri Bilvapatra Trust
 */
export const sendBirthdayWhatsAppWishes = async ({
  userIds,
  title,
  message,
}: {
  userIds: number[];
  title: string;
  message: string;
}): Promise<{
  total: number;
  eligible: number;
  sentCount: number;
  failedCount: number;
}> => {
  const cleanIds = Array.from(
    new Set(userIds.filter(id => Number.isFinite(id) && id > 0)),
  );
  if (!cleanIds.length) {
    return {total: 0, eligible: 0, sentCount: 0, failedCount: 0};
  }

  const placeholders = cleanIds.map(() => '?').join(', ');
  const rows = await mysql.query<any[]>(
    `
    SELECT
      u.id,
      u.full_name AS fullName,
      u.mobile_number AS mobileNumber,
      u.mobile_country_code AS mobileCountryCode,
      u.firebase_uid AS firebaseUid
    FROM users u
    WHERE u.id IN (${placeholders})
  `,
    cleanIds,
  );

  let sentCount = 0;
  let failedCount = 0;
  let eligible = 0;

  for (const user of rows) {
    if (isPlaceholderMobile(user.firebaseUid, user.mobileNumber)) {
      continue;
    }
    const destination = formatAiSensyMobile(
      user.mobileNumber,
      user.mobileCountryCode,
    );
    if (!destination) {
      continue;
    }

    eligible++;
    const devoteeName = String(user.fullName || 'Devotee').trim() || 'Devotee';

    const result = await sendAiSensyCampaign({
      destination,
      userName: devoteeName,
      campaignName: 'birthday_wishes',
      templateParams: [devoteeName, title.trim(), message.trim()],
    });

    if (result.success) {
      sentCount++;
    } else {
      failedCount++;
    }
  }

  console.log(
    `[AiSensy Birthday] Processed ${rows.length} users: ${sentCount} sent, ${failedCount} failed (${eligible} eligible).`,
  );

  return {
    total: cleanIds.length,
    eligible,
    sentCount,
    failedCount,
  };
};

/**
 * Sends Nithya Homam WhatsApp announcements/updates.
 */
export const sendHomamWhatsAppMessage = async ({
  userIds,
  title,
  message,
  campaignName = 'nithya_homam',
}: {
  userIds: number[];
  title: string;
  message: string;
  campaignName?: string;
}): Promise<{
  total: number;
  eligible: number;
  sentCount: number;
  failedCount: number;
}> => {
  const cleanIds = Array.from(
    new Set(userIds.filter(id => Number.isFinite(id) && id > 0)),
  );
  if (!cleanIds.length) {
    return {total: 0, eligible: 0, sentCount: 0, failedCount: 0};
  }

  const placeholders = cleanIds.map(() => '?').join(', ');
  const rows = await mysql.query<any[]>(
    `
    SELECT
      u.id,
      u.full_name AS fullName,
      u.mobile_number AS mobileNumber,
      u.mobile_country_code AS mobileCountryCode,
      u.firebase_uid AS firebaseUid
    FROM users u
    WHERE u.id IN (${placeholders})
  `,
    cleanIds,
  );

  let sentCount = 0;
  let failedCount = 0;
  let eligible = 0;

  for (const user of rows) {
    if (isPlaceholderMobile(user.firebaseUid, user.mobileNumber)) {
      continue;
    }
    const destination = formatAiSensyMobile(
      user.mobileNumber,
      user.mobileCountryCode,
    );
    if (!destination) {
      continue;
    }

    eligible++;
    const devoteeName = String(user.fullName || 'Devotee').trim() || 'Devotee';

    const result = await sendAiSensyCampaign({
      destination,
      userName: devoteeName,
      campaignName,
      templateParams: [devoteeName, title.trim(), message.trim()],
    });

    if (result.success) {
      sentCount++;
    } else {
      failedCount++;
    }
  }

  return {
    total: cleanIds.length,
    eligible,
    sentCount,
    failedCount,
  };
};

export default {
  sendAiSensyCampaign,
  sendBirthdayWhatsAppWishes,
  sendHomamWhatsAppMessage,
};
