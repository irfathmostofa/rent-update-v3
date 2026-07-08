# Rent Management System (React + Vite + Supabase)

A multi-tenant house/cottage rent management app: owners manage their own properties, rentals, invoices, and WhatsApp/SMS reminders, while a super admin can activate/hold/terminate any owner account.

## Setup

1. **Database**: run the full SQL schema (provided separately) in your Supabase project's SQL Editor. This creates all tables, RLS policies, triggers (auto-create owner profile + auto-activate on email verification), and the `overdue_invoices` view.

2. **Environment variables**: copy `.env.example` to `.env` and fill in your project's values from Supabase Dashboard -> Project Settings -> API:
   ```
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   ```

3. **Install & run**:
   ```bash
   npm install
   npm run dev
   ```

4. **Email verification**: Supabase sends a confirmation email automatically on signup (configure the redirect URL in Supabase Dashboard -> Authentication -> URL Configuration if needed). Once confirmed, a trigger flips the owner's status to `active`.

5. **Create your first super admin** (run once in SQL Editor after registering normally through the app):
   ```sql
   update owners set role_id = 1, status_id = 2 where email = 'your-admin-email@example.com';
   ```

## What's included

- `/register`, `/login` -- Supabase Auth signup/login with email verification gating
- `/dashboard` -- owner's own data only (enforced by RLS):
  - **Overview** -- quick stats
  - **Properties** -- add apartment (rooms/bathrooms/balcony/price) or cottage (per-room seats & seat cost) + shared facilities (water/electricity/wifi/etc.)
  - **Rentals** -- create tenant + rental, auto-generates first 30-day invoice
  - **Invoices** -- record payments (supports partial payments), generate next cycle's invoice
  - **Overdue** -- pulls from the `overdue_invoices` view (days overdue = today minus due_date)
  - **Messages** -- create reusable templates with `{tenant_name}`, `{amount}`, `{due_date}` placeholders, send via WhatsApp deep link (`wa.me`), logs every send
- `/admin` -- super admin only: view all owners, activate / hold / terminate accounts with a reason, full audit trail in `admin_action_logs`

## Notes

- "30 days per month" billing is implemented by always adding exactly 30 days to `period_start` for `period_end`/`due_date`, both when a rental starts and each time the next invoice is generated -- never relying on calendar month length.
- WhatsApp sending currently opens `wa.me` with a pre-filled message (manual send tap) since it requires no API setup. To automate sending (no manual tap), swap that call for the WhatsApp Business Cloud API from a Supabase Edge Function -- happy to add that next if you want full automation.
- Account hold/terminate is currently a **soft block**: the user can still log in but `ProtectedRoute` shows a blocked screen instead of the dashboard. For a hard block (prevents login entirely), an Edge Function calling Supabase Admin API (`auth.admin.updateUserById` with `ban_duration`) would be needed.
# rent-v2
# rent-update-v3
# rent-update-v3
