const { sql } = require('../lib/db');
const { requireAuth, clearSessionCookie } = require('../lib/auth');

module.exports = requireAuth(async (req, res, user) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
  await sql`
    INSERT INTO audit_log (user_id, email, action, detail, ip, created_at)
    VALUES (${user.uid}, ${user.email}, 'logout', NULL, ${ip}, ${new Date().toISOString()})
  `;
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
});
