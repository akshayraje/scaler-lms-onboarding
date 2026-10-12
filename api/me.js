const { sql, ensureSchema } = require('../lib/db');
const { requireAuth, isAdminEmail } = require('../lib/auth');
const { MODULE_COUNT } = require('../lib/course-data');

module.exports = requireAuth(async (req, res, user) => {
  await ensureSchema();

  const { rows: progress } = await sql`SELECT module_id FROM progress WHERE user_id = ${user.uid}`;
  const { rows: attempts } = await sql`
    SELECT * FROM exam_attempts WHERE user_id = ${user.uid} ORDER BY submitted_at DESC LIMIT 1
  `;
  const { rows: certs } = await sql`
    SELECT * FROM certificates WHERE user_id = ${user.uid} ORDER BY issued_at DESC LIMIT 1
  `;

  const attempt = attempts[0];
  const cert = certs[0];

  res.status(200).json({
    name: user.name,
    email: user.email,
    completed: progress.map((r) => r.module_id),
    moduleCount: MODULE_COUNT,
    examScore: attempt ? attempt.score : null,
    examPassed: attempt ? attempt.passed : false,
    certificate: cert ? { code: cert.cert_code, issuedAt: cert.issued_at, score: cert.score } : null,
    isAdmin: isAdminEmail(user.email),
  });
});
