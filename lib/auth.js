const jwt = require('jsonwebtoken');

const {
  SESSION_SECRET,
  COMPANY_DOMAIN,
  ADMIN_EMAILS = '',
  COOKIE_SECURE = 'true',
} = process.env;

const ADMIN_SET = new Set(
  ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
);

function isAdminEmail(email) {
  return ADMIN_SET.has((email || '').toLowerCase());
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}

function setSessionCookie(res, user) {
  const token = jwt.sign(
    { uid: user.id, email: user.email, name: user.name },
    SESSION_SECRET,
    { expiresIn: '12h' }
  );
  const parts = [
    `session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${12 * 60 * 60}`,
  ];
  if (COOKIE_SECURE !== 'false') parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res) {
  const parts = ['session=', 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (COOKIE_SECURE !== 'false') parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

// Returns the decoded session { uid, email, name } or null. Does not throw.
function getSession(req) {
  const cookies = parseCookies(req);
  if (!cookies.session) return null;
  try {
    return jwt.verify(cookies.session, SESSION_SECRET);
  } catch (e) {
    return null;
  }
}

// Wraps a Vercel function handler to require a valid session.
// Usage: module.exports = requireAuth(async (req, res, user) => { ... });
function requireAuth(handler) {
  return async (req, res) => {
    const user = getSession(req);
    if (!user) {
      res.status(401).json({ error: 'Not signed in' });
      return;
    }
    return handler(req, res, user);
  };
}

// Wraps a handler to require both a valid session AND admin email.
function requireAdmin(handler) {
  return requireAuth(async (req, res, user) => {
    if (!isAdminEmail(user.email)) {
      res.status(403).json({ error: 'Admin access only' });
      return;
    }
    return handler(req, res, user);
  });
}

module.exports = {
  COMPANY_DOMAIN,
  isAdminEmail,
  setSessionCookie,
  clearSessionCookie,
  getSession,
  requireAuth,
  requireAdmin,
};
