const { sql, ensureSchema } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');
const { MODULE_COUNT } = require('../../lib/course-data');

module.exports = requireAuth(async (req, res, user) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  await ensureSchema();

  const { moduleId } = req.body || {};
  if (typeof moduleId !== 'number' || moduleId < 0 || moduleId >= MODULE_COUNT) {
    return res.status(400).json({ error: 'Invalid module id' });
  }

  const now = new Date().toISOString();
  await sql`
    INSERT INTO progress (user_id, module_id, completed_at)
    VALUES (${user.uid}, ${moduleId}, ${now})
    ON CONFLICT (user_id, module_id) DO NOTHING
  `;
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
  await sql`
    INSERT INTO audit_log (user_id, email, action, detail, ip, created_at)
    VALUES (${user.uid}, ${user.email}, 'module_complete', ${'module=' + moduleId}, ${ip}, ${now})
  `;

  const { rows } = await sql`SELECT module_id FROM progress WHERE user_id = ${user.uid}`;
  res.status(200).json({ ok: true, completed: rows.map((r) => r.module_id) });
});
