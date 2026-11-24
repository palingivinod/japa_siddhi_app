/** Count users by app_version via admin users API (paginated if needed). */
const API = process.env.API_URL || 'https://japasiddhi.onrender.com/api/v1';

async function fetchUsers(page = 1, limit = 500) {
  const url = `${API}/admin/users?page=${page}&limit=${limit}`;
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  return {status: res.status, json};
}

(async () => {
  const counts = new Map();
  let total = 0;
  let on130 = 0;
  let page = 1;
  let guard = 0;

  // Try common list shapes; fall back to single fetch.
  while (guard < 30) {
    guard += 1;
    const {status, json} = await fetchUsers(page, 500);
    if (status !== 200 || !json?.success) {
      // try without pagination
      if (page === 1) {
        const res = await fetch(`${API}/admin/users`);
        const body = await res.json().catch(() => ({}));
        console.log('USERS_STATUS', res.status);
        const rows = body?.data?.users || body?.data || body?.users || [];
        if (!Array.isArray(rows)) {
          console.log('USERS_SHAPE', JSON.stringify(body).slice(0, 800));
          return;
        }
        for (const row of rows) {
          const v = String(row.appVersion || row.app_version || '').trim() || '(none)';
          counts.set(v, (counts.get(v) || 0) + 1);
          total += 1;
          if (v.startsWith('1.3.0')) on130 += 1;
        }
        break;
      }
      console.log('PAGE_FAIL', page, status, JSON.stringify(json).slice(0, 300));
      break;
    }
    const rows =
      json?.data?.users ||
      json?.data?.rows ||
      (Array.isArray(json?.data) ? json.data : []);
    if (!Array.isArray(rows) || rows.length === 0) {
      if (page === 1) {
        console.log('USERS_SHAPE', JSON.stringify(json).slice(0, 800));
      }
      break;
    }
    for (const row of rows) {
      const v = String(row.appVersion || row.app_version || '').trim() || '(none)';
      counts.set(v, (counts.get(v) || 0) + 1);
      total += 1;
      if (v.startsWith('1.3.0')) on130 += 1;
    }
    const totalPages = Number(json?.data?.totalPages || json?.data?.pages || 0);
    if (totalPages && page >= totalPages) break;
    if (rows.length < 500) break;
    page += 1;
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  console.log('TOTAL_USERS_SCANNED', total);
  console.log('ON_1_3_0', on130);
  console.log('BY_VERSION', JSON.stringify(sorted, null, 2));
})().catch(e => {
  console.error('ERR', e.message);
  process.exit(1);
});
