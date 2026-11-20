import mysql from '../../database/mysql';

const num = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const listSamuhikaCategories = async () => {
  const mantraRepository = (await import('../mantra/mantra.repository')).default;
  return mantraRepository.listCategories();
};

export const listSamuhikaMantras = async (categoryCode?: string) => {
  const mantraRepository = (await import('../mantra/mantra.repository')).default;
  const rows = await mantraRepository.getAllMantras('SAMUHIKA');
  const code = String(categoryCode || '').trim();
  const filtered = code
    ? (rows || []).filter(
        (row: any) => String(row.categoryCode || '') === code,
      )
    : rows || [];
  return filtered.map((row: any) => ({
    id: Number(row.id),
    name: row.mantraName || '',
    categoryCode: row.categoryCode || '',
    target: num(row.defaultJapaCount),
    deadlineAt: row.deadlineAt || null,
    active: Number(row.isActive) === 1 || row.isActive === true,
  }));
};

/**
 * True when this japa_goals row is a Samuhika *campaign* enrollment for the
 * mantra — not a personal Antharanga/sankalpa goal that happens to share the
 * catalog mantra_id or the word "samuhika".
 */
const isCampaignEnrollment = (opts: {
  mantraTarget: number;
  goalTarget: number;
  mantraType: string;
  personalMantraId: number;
  notes: string;
  goalName: string;
}) => {
  if (opts.personalMantraId > 0) {
    return false;
  }
  if (String(opts.mantraType || '').toUpperCase() === 'PERSONAL') {
    return false;
  }
  const notes = String(opts.notes || '').toLowerCase();
  const goalName = String(opts.goalName || '').toLowerCase();
  const labeled =
    notes.includes('samuhika') || goalName.includes('samuhika');
  if (!labeled) {
    return false;
  }
  // Explicit campaign enrollments from joinSamuhika always set this note.
  if (notes.includes('samuhika campaign')) {
    return true;
  }
  const mantraTarget = opts.mantraTarget;
  const goalTarget = opts.goalTarget;
  if (mantraTarget <= 0) {
    return true;
  }
  // Drop classic personal sankalpa sizes (108 / 1008 / 10800) on large campaigns.
  if (mantraTarget >= 1000 && goalTarget > 0 && goalTarget < mantraTarget * 0.5) {
    return false;
  }
  return goalTarget <= 0 || goalTarget >= mantraTarget * 0.5;
};

export const getSamuhikaMantraAnalytics = async (mantraId: number) => {
  const id = Number(mantraId);
  if (!id) {
    return null;
  }
  const mantraRepository = (await import('../mantra/mantra.repository')).default;
  const mantra = await mantraRepository.getById(id);
  if (!mantra || String(mantra.japaList || '').toUpperCase() !== 'SAMUHIKA') {
    return null;
  }

  const mantraTarget = num(mantra.defaultJapaCount);

  const goalRows = await mysql.query<any[]>(
    `
    SELECT
      g.id AS goalId,
      g.user_id AS userId,
      g.target_count AS targetCount,
      g.completed_count AS completedCount,
      g.status AS status,
      g.end_date AS endDate,
      g.notes AS notes,
      g.goal_name AS goalName,
      IFNULL(g.mantra_type, 'DEFAULT') AS mantraType,
      IFNULL(g.personal_mantra_id, 0) AS personalMantraId,
      u.full_name AS fullName,
      u.mobile_country_code AS mobileCountryCode,
      u.mobile_number AS mobileNumber,
      u.email AS email
    FROM japa_goals g
    LEFT JOIN users u ON u.id = g.user_id
    WHERE g.mantra_id = ?
      AND (
        LOWER(IFNULL(g.notes, '')) LIKE '%samuhika%'
        OR LOWER(IFNULL(g.goal_name, '')) LIKE '%samuhika%'
      )
      AND UPPER(IFNULL(g.mantra_type, 'DEFAULT')) <> 'PERSONAL'
      AND IFNULL(g.personal_mantra_id, 0) = 0
    ORDER BY g.completed_count DESC, g.id DESC
    `,
    [id],
  );

  const mapped = (goalRows || [])
    .map((row: any) => {
      const done = num(row.completedCount);
      const goalTarget = num(row.targetCount);
      if (
        !isCampaignEnrollment({
          mantraTarget,
          goalTarget,
          mantraType: String(row.mantraType || ''),
          personalMantraId: num(row.personalMantraId),
          notes: String(row.notes || ''),
          goalName: String(row.goalName || ''),
        })
      ) {
        return null;
      }
      const code = String(row.mobileCountryCode || '').trim();
      const mobile = String(row.mobileNumber || '').trim();
      const phone = [code, mobile].filter(Boolean).join(' ').trim();
      const campaignTarget =
        mantraTarget > 0 ? mantraTarget : goalTarget > 0 ? goalTarget : 0;
      return {
        userId: num(row.userId),
        goalId: num(row.goalId),
        name: String(row.fullName || '').trim() || 'Devotee',
        phone,
        email: String(row.email || '').trim(),
        japaCount: done,
        targetCount: campaignTarget,
        goalTarget,
        status: String(row.status || ''),
        endDate: row.endDate || null,
        completed: campaignTarget > 0 && done >= campaignTarget,
      };
    })
    .filter(Boolean) as Array<{
    userId: number;
    goalId: number;
    name: string;
    phone: string;
    email: string;
    japaCount: number;
    targetCount: number;
    goalTarget: number;
    status: string;
    endDate: string | null;
    completed: boolean;
  }>;

  // One enrollment row per user — keep the best progress (avoids join duplicates).
  const byUser = new Map<number, (typeof mapped)[0]>();
  mapped.forEach(row => {
    const prev = byUser.get(row.userId);
    if (!prev) {
      byUser.set(row.userId, row);
      return;
    }
    if (row.japaCount > prev.japaCount) {
      byUser.set(row.userId, row);
      return;
    }
    if (row.japaCount === prev.japaCount && row.completed && !prev.completed) {
      byUser.set(row.userId, row);
    }
  });
  const users = Array.from(byUser.values()).sort(
    (a, b) => b.japaCount - a.japaCount || b.goalId - a.goalId,
  );

  const enrolled = users.length;
  const doneCount = users.filter(item => item.completed).length;

  return {
    mantra: {
      id,
      name: mantra.mantraName || '',
      target: num(mantra.defaultJapaCount),
      deadlineAt: mantra.deadlineAt || null,
      categoryCode: mantra.categoryCode || '',
    },
    enrolled,
    done: doneCount,
    users,
  };
};
