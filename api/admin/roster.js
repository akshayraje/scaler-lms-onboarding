const { sql, ensureSchema } = require('../../lib/db');
const { requireAdmin } = require('../../lib/auth');
const { MODULE_COUNT } = require('../../lib/course-data');

module.exports = requireAdmin(async (req, res) => {
  await ensureSchema();

  const { rows: users } = await sql`SELECT * FROM users ORDER BY last_login_at DESC`;

  const roster = [];
  for (const u of users) {
    const { rows: progress } = await sql`SELECT module_id FROM progress WHERE user_id = ${u.id}`;
    const { rows: attempts } = await sql`
      SELECT * FROM exam_attempts WHERE user_id = ${u.id} ORDER BY submitted_at DESC LIMIT 1
    `;
    const { rows: certs } = await sql`SELECT * FROM certificates WHERE user_id = ${u.id}`;
    const attempt = attempts[0];
    const cert = certs[0];

    roster.push({
      name: u.name,
      email: u.email,
      firstLogin: u.first_login_at,
      lastLogin: u.last_login_at,
      progressPct: Math.round((progress.length / MODULE_COUNT) * 100),
      examScore: attempt ? attempt.score : null,
      certified: !!cert,
      certCode: cert ? cert.cert_code : null,
    });
  }

  res.status(200).json(roster);
});
