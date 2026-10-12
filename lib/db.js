// Uses Vercel Postgres (Neon-backed). When you create a Postgres store in
// the Vercel dashboard and link it to this project, the POSTGRES_URL and
// friends env vars are injected automatically — no connection string to
// manage by hand.
const { sql } = require('@vercel/postgres');

let schemaReady = false;

// Idempotent — safe to call on every cold start. CREATE TABLE IF NOT EXISTS
// means this costs almost nothing once the tables already exist.
async function ensureSchema() {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      first_login_at TIMESTAMPTZ NOT NULL,
      last_login_at TIMESTAMPTZ NOT NULL
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS progress (
      user_id INTEGER NOT NULL REFERENCES users(id),
      module_id INTEGER NOT NULL,
      completed_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (user_id, module_id)
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS exam_attempts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      score INTEGER NOT NULL,
      passed BOOLEAN NOT NULL,
      submitted_at TIMESTAMPTZ NOT NULL
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS certificates (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      cert_code TEXT UNIQUE NOT NULL,
      score INTEGER NOT NULL,
      issued_at TIMESTAMPTZ NOT NULL
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      email TEXT,
      action TEXT NOT NULL,
      detail TEXT,
      ip TEXT,
      created_at TIMESTAMPTZ NOT NULL
    );
  `;
  schemaReady = true;
}

module.exports = { sql, ensureSchema };
