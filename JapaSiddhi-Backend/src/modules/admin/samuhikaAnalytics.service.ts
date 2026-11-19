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

  const goalRows = await mysql.query<any[]>(
    `
    SELECT
      g.id AS goalId,
      g.user_id AS userId,
      g.target_count AS targetCount,
      g.completed_count AS completedCount,
      g.status AS status,
      g.end_date AS endDate,
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
    ORDER BY g.completed_count DESC, g.id DESC
    `,
    [id],
  );

  const users = (goalRows || []).map((row: any) => {
    const done = num(row.completedCount);
    const target = num(row.targetCount);
    const code = String(row.mobileCountryCode || '').trim();
    const mobile = String(row.mobileNumber || '').trim();
    const phone = [code, mobile].filter(Boolean).join(' ').trim();
    return {
      userId: num(row.userId),
      goalId: num(row.goalId),
      name: String(row.fullName || '').trim() || 'Devotee',
      phone,
      email: String(row.email || '').trim(),
      japaCount: done,
      targetCount: target,
      status: String(row.status || ''),
      endDate: row.endDate || null,
      completed: target > 0 && done >= target,
    };
  });

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
