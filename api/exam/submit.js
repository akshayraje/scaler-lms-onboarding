const crypto = require('crypto');
const { sql, ensureSchema } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');
const { gradeExam } = require('../../lib/course-data');

module.exports = requireAuth(async (req, res, user) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  await ensureSchema();

  let result;
  try {
    result = gradeExam((req.body || {}).answers);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const now = new Date().toISOString();
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;

  await sql`
    INSERT INTO exam_attempts (user_id, score, passed, submitted_at)
    VALUES (${user.uid}, ${result.score}, ${result.passed}, ${now})
  `;
  await sql`
    INSERT INTO audit_log (user_id, email, action, detail, ip, created_at)
    VALUES (${user.uid}, ${user.email}, 'exam_submit', ${`score=${result.score} passed=${result.passed}`}, ${ip}, ${now})
  `;

  if (result.passed) {
    const { rows: existing } = await sql`SELECT * FROM certificates WHERE user_id = ${user.uid}`;
    if (existing.length === 0) {
      const certCode = crypto
        .createHmac('sha256', process.env.SESSION_SECRET)
        .update(`${user.uid}:${user.email}:posh-pocso-v1:${now}`)
        .digest('hex')
        .slice(0, 12)
        .toUpperCase();
      await sql`
        INSERT INTO certificates (user_id, cert_code, score, issued_at)
        VALUES (${user.uid}, ${certCode}, ${result.score}, ${now})
      `;
      await sql`
        INSERT INTO audit_log (user_id, email, action, detail, ip, created_at)
        VALUES (${user.uid}, ${user.email}, 'certificate_issued', ${certCode}, ${ip}, ${now})
      `;
    }
  }

  res.status(200).json(result);
});
