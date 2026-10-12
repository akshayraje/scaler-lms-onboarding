const { sql, ensureSchema } = require('../../lib/db');
const { requireAdmin } = require('../../lib/auth');

module.exports = requireAdmin(async (req, res) => {
  await ensureSchema();
  const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);
  const { rows } = await sql`
    SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ${limit}
  `;
  res.status(200).json(rows);
});
