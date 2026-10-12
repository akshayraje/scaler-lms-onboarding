const { sql, ensureSchema } = require('../../lib/db');

module.exports = async (req, res) => {
  await ensureSchema();
  const code = String(req.query.code || '').toUpperCase();

  const { rows } = await sql`
    SELECT c.*, u.name, u.email
    FROM certificates c JOIN users u ON u.id = c.user_id
    WHERE cert_code = ${code}
  `;
  const cert = rows[0];

  res.setHeader('Content-Type', 'text/html');
  if (!cert) {
    return res.status(404).send(`<h1>Certificate not found</h1><p>No certificate matches code ${code}.</p>`);
  }
  res.status(200).send(`
    <h1>Certificate verified ✅</h1>
    <p><strong>${cert.name}</strong> (${cert.email}) completed <em>Scaler Respect@Work</em> on
    ${new Date(cert.issued_at).toLocaleDateString()} with a score of ${cert.score}%.</p>
    <p>Certificate code: ${cert.cert_code}</p>
  `);
};
