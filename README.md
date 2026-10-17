# Secure Tasks

A secure to-do app: Next.js + Supabase + Vercel. Works on desktop and installs on a phone (PWA).

## Roles
| Role | Can do |
|------|--------|
| admin | Everything: manage users, settings, backups, restore; sees all tasks (read-only) |
| manager | Own tasks + read-only view of the whole team's tasks |
| staff | Own tasks (add, edit, tick off, delete) |
| viewer | Read-only on their own tasks |

## Requirements map
| Requirement | Where |
|-------------|-------|
| Two-factor authentication | `app/api/auth/login`, `verify-2fa` (TOTP) |
| Login with salt and pepper | `lib/crypto.js` (pepper from `process.env.PEPPER`, HMAC-SHA256, then bcrypt salt) |
| Backup | `lib/backup.js`, daily cron in `vercel.json`, "Back up now" in Admin > System |
| User roles | `lib/permissions.js`, role checks in every API route and page |
| Interface | `app/dashboard` (tasks), `app/team`, `app/admin` |
| Current state of system | Admin > System > System state |
| Restore (configuration only) | Admin > System > Restore points / Backups. Changes the `settings` table only |
| Admin: add, modify, delete users | Admin > Users |
| Deleted user stays in the system | Soft delete: `users.deleted_at`. Row and tasks are kept |
| Rows in data table / records | `users`, `tasks`, `settings`, `restore_points` + `scripts/seed.js` |
| Pepper from the system environment | `PEPPER` env var (Vercel + `.env.local`) |
| Desktop web + mobile app | Responsive layout + `app/manifest.js` + `public/sw.js` (installable) |
| 4+ users with different roles | admin, manager, staff, viewer (`scripts/seed.js`) |

## Upgrade steps (from the first version)
1. Supabase > SQL Editor: run `supabase/migration-part2.sql` once.
2. Copy the new files over the project, then `npm run dev`.
3. `node scripts/seed.js` to create the demo users and sample tasks.
4. Push to GitHub; Vercel redeploys by itself.

## Install on a phone
Open the live Vercel link in Chrome (Android) or Safari (iPhone), then use
"Add to Home screen" / "Install app".
