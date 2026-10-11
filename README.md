# Secure Login System

Next.js + Supabase + Vercel. Covers every part of the assignment:

| Part | Requirement | Where |
|------|-------------|-------|
| a | User identification | `app/api/auth/register`, `login` (unique username/email) |
| b | Authentication, 2-step factor | password (`login`) then TOTP code (`verify-2fa`) |
| c | Authorization, roles | `role` column; checks in `app/admin/page.js` and `app/api/admin/users` |
| d | Salt and pepper | `lib/crypto.js` (HMAC-SHA256 pepper + bcrypt per-user salt) |
| e | Auto backups | `app/api/cron/backup` + `vercel.json` cron (daily 02:00 UTC) |
| f | Cryptographic techniques | bcrypt, HMAC-SHA256, AES-256-GCM (2FA secrets and backups), JWT (HS256), HTTPS |
| g | Vercel connected to the cloud server | Vercel env vars + cron job writes backups into Supabase Storage |
| h | Pepper saved in system environment | `PEPPER` env var, never in code or database |

## Setup

1. **Supabase**: create a free project at supabase.com. In the SQL Editor, run `supabase/schema.sql`.
   Copy the Project URL and the `service_role` key (Project Settings > API).
2. **Local**: `npm install`, copy `.env.example` to `.env.local`, fill in the values.
   Generate each secret with `openssl rand -base64 32` (PEPPER, SESSION_SECRET, ENCRYPTION_KEY, BACKUP_KEY, CRON_SECRET).
   Set `ADMIN_EMAIL` to the email you will register with.
3. `npm run dev`, open http://localhost:3000, register, scan the QR with Google Authenticator, log in.
4. **Deploy**: push to GitHub, import the repo in Vercel, add the same env vars
   (Settings > Environment Variables), deploy. The cron job in `vercel.json` then runs daily.
5. **Test a backup now**:
   `curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://YOUR-APP.vercel.app/api/cron/backup`
   Then check Supabase > Storage > backups for the encrypted `.enc` file.
6. **Restore/read a backup**: download the file, then
   `BACKUP_KEY="..." node scripts/decrypt-backup.js backup-XXXX.enc`

## Security notes
- Keep `PEPPER` safe. If you lose or change it, existing passwords stop working.
- The service-role key and all secrets live only on the server (env vars), never in browser code.
- 5 wrong attempts locks the account for 15 minutes.
