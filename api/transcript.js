const { sql, ensureSchema } = require('../lib/db');
const { requireAuth } = require('../lib/auth');

module.exports = requireAuth(async (req, res, user) => {
  await ensureSchema();
  const { rows } = await sql`
    SELECT * FROM certificates WHERE user_id = ${user.uid} ORDER BY issued_at DESC LIMIT 1
  `;
  const cert = rows[0];
  if (!cert) {
    return res.status(404).json({ error: 'No certificate on file yet — complete the final assessment first.' });
  }
  res.status(200).json({
    name: user.name,
    email: user.email,
    course: 'Scaler Respect@Work — POSH Act, 2013 & POCSO Act, 2012 Awareness Training',
    score: cert.score,
    issuedAt: cert.issued_at,
    certCode: cert.cert_code,
  });
});
