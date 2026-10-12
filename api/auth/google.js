const { OAuth2Client } = require('google-auth-library');
const { sql, ensureSchema } = require('../../lib/db');
const { COMPANY_DOMAIN, setSessionCookie } = require('../../lib/auth');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function nowIso() {
  return new Date().toISOString();
}

async function logAudit({ userId, email, action, detail, ip }) {
  await sql`
    INSERT INTO audit_log (user_id, email, action, detail, ip, created_at)
    VALUES (${userId ?? null}, ${email ?? null}, ${action}, ${detail ?? null}, ${ip ?? null}, ${nowIso()})
  `;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  await ensureSchema();

  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ error: 'Missing credential' });

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid Google token' });
  }

  const email = (payload.email || '').toLowerCase();
  const emailVerified = payload.email_verified;
  const domainOk =
    (payload.hd && payload.hd.toLowerCase() === COMPANY_DOMAIN.toLowerCase()) ||
    email.endsWith('@' + COMPANY_DOMAIN.toLowerCase());

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;

  if (!emailVerified || !domainOk) {
    await logAudit({ email, action: 'login_denied', detail: `hd=${payload.hd}`, ip });
    return res.status(403).json({ error: `Only @${COMPANY_DOMAIN} Google Workspace accounts may sign in.` });
  }

  const name = payload.name || email;
  const { rows: existing } = await sql`SELECT * FROM users WHERE email = ${email}`;
  let user;
  if (existing.length === 0) {
    const { rows } = await sql`
      INSERT INTO users (email, name, first_login_at, last_login_at)
      VALUES (${email}, ${name}, ${nowIso()}, ${nowIso()})
      RETURNING id, email, name
    `;
    user = rows[0];
  } else {
    user = existing[0];
    await sql`UPDATE users SET last_login_at = ${nowIso()}, name = ${name} WHERE id = ${user.id}`;
  }

  setSessionCookie(res, user);
  await logAudit({ userId: user.id, email, action: 'login', ip });

  res.status(200).json({ ok: true });
};
