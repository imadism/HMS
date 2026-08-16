# Publish GrandStay for your team

This version uses **Supabase Auth** for email/password sign-in and Supabase
Postgres for the shared application workspace. Its database permissions use
Row Level Security (RLS), so a browser can use a publishable key without
exposing a database administrator key.

## 1. Create the backend

1. Create a project at [Supabase](https://supabase.com/dashboard).
2. Open **SQL Editor**, create a query, paste in `supabase/schema.sql`, and run it.
3. Under **Authentication > Providers**, keep Email enabled. For a company-only
   system, turn off public sign-ups after creating the first account.
4. Under **Authentication > URL Configuration**, add your production website URL
   as the Site URL and as a Redirect URL.
5. Copy the **Project URL** and **Publishable key** from the project's Connect/API
   settings into `supabase/config.js`. Do not ever use a `sb_secret_` or
   `service_role` key in this repository.

## 2. Create the first administrator

1. In **Authentication > Users**, create an email/password user for yourself.
2. Open the deployed app and sign in with that account.
3. The app will ask for the organization name. Creating it makes that user the
   organization administrator and creates the shared workspace.

## 3. Add colleagues safely

For now, create users in **Authentication > Users**, then run this SQL for each
user (replace the email and role):

```sql
insert into public.organization_members (organization_id, user_id, role)
select m.organization_id, p.id, 'Reservation Agent'
from public.organization_members m
join public.profiles owner on owner.id = m.user_id
join public.profiles p on p.id = (select id from auth.users where email = 'colleague@example.com')
where owner.id = (select id from auth.users where email = 'your-admin@example.com')
  and m.role = 'Administrator';
```

Use one of: `Administrator`, `Reservation Agent`, `Accountant`, or `View Only`.
The user-management screen has been deliberately disabled in the hosted version:
it cannot safely create Auth passwords from browser code. A later secure phase
can add an invite-only server function.

## 4. Deploy the website

Upload the whole project to a static host such as Netlify, Cloudflare Pages, or
Vercel. There is no server to install for this version. Confirm the resulting
HTTPS URL is in Supabase Auth's URL Configuration.

## Important first-version limitation

The existing application is saved as one shared JSON workspace so the migration
does not rewrite its reservation UI. Two people editing at precisely the same
time can overwrite the other's most recent save. Before high-volume production
use, the next phase should normalize this into separate `reservations`,
`payments`, `clients`, and `hotels` tables with per-record RLS and audit history.
