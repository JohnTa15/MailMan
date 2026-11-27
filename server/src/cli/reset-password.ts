/**
 * Sets a new password for a Mailman account, for when it is forgotten.
 * Run it on the server itself (whoever can do that already owns the data):
 *
 *   sudo docker exec -it mailman node dist/cli/reset-password.js              # list accounts
 *   sudo docker exec -it mailman node dist/cli/reset-password.js you@mail.com # new password
 *
 * Prints a new random password once; change it in Settings → Account.
 */
import { randomBytes } from 'crypto';
import { Database } from 'sqlite3';
import { hashPassword } from '../crypto/password';

const dbPath = process.env.DATABASE_PATH || 'webmail.db';

function open(): Promise<Database> {
  return new Promise((resolve, reject) => {
    const db = new Database(dbPath, (err) => (err ? reject(err) : resolve(db)));
  });
}
const all = <T>(db: Database, sql: string, params: unknown[] = []) =>
  new Promise<T[]>((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows as T[]))));
const run = (db: Database, sql: string, params: unknown[]) =>
  new Promise<number>((resolve, reject) =>
    db.run(sql, params, function (this: { changes: number }, err) {
      if (err) reject(err);
      else resolve(this.changes);
    }),
  );

/** 4 groups of 5 easy-to-type characters, about 100 bits */
function newPassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(20);
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]);
  return [0, 5, 10, 15].map((i) => chars.slice(i, i + 5).join('')).join('-');
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const db = await open();
  try {
    const users = await all<{ email: string; role: string }>(db, 'SELECT email, role FROM users ORDER BY role, email');
    if (!email) {
      console.log(users.length ? 'Mailman accounts:' : 'No Mailman accounts yet.');
      for (const u of users) console.log(`  ${u.email}${u.role === 'admin' ? '  (admin)' : ''}`);
      console.log('\nUsage: node dist/cli/reset-password.js <email>');
      return;
    }
    const password = newPassword();
    const changed = await run(db, 'UPDATE users SET passwordHash = ?, updatedAt = datetime(\'now\') WHERE lower(email) = ?', [
      await hashPassword(password),
      email,
    ]);
    if (!changed) {
      console.error(`No account ${email}. Run without an email to list them.`);
      process.exitCode = 1;
      return;
    }
    console.log(`New password for ${email}:\n\n    ${password}\n\nSign in with it, then change it in Settings → Account.`);
  } finally {
    db.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
