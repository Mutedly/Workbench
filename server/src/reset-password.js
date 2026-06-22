// CLI password reset — for when you're locked out and have server access.
// Usage: node src/reset-password.js <email> <newPassword>
import bcrypt from 'bcryptjs';
import db from './db.js';

const [, , emailArg, passwordArg] = process.argv;

if (!emailArg || !passwordArg) {
  console.error('Usage: node src/reset-password.js <email> <newPassword>');
  process.exit(1);
}
if (passwordArg.length < 6) {
  console.error('Password must be at least 6 characters.');
  process.exit(1);
}

const email = emailArg.toLowerCase();
const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
if (!user) {
  console.error(`No account found for "${email}".`);
  const all = db.prepare('SELECT email FROM users').all().map((u) => u.email);
  if (all.length) console.error('Known accounts:', all.join(', '));
  process.exit(1);
}

db.prepare('UPDATE users SET password_hash = ?, reset_code_hash = NULL, reset_expires = NULL WHERE id = ?')
  .run(bcrypt.hashSync(passwordArg, 10), user.id);

console.log(`Password updated for ${email}. You can now log in with the new password.`);
process.exit(0);
