# Set up shared GrandStay accounts and data

The app now signs in through Supabase Auth and reads/writes one shared JSON workspace in Supabase Postgres. Row Level Security (RLS) limits each workspace to its members. Browser local storage is an organization-scoped cache; Supabase is the central copy used across devices.

## 1. Create the Supabase project and database

1. Create a project at [Supabase](https://supabase.com/dashboard).
2. In the project, open **SQL Editor**, choose **New query**, paste the entire contents of `supabase/schema.sql`, and run it. This creates the profile, organization, membership, and shared workspace tables, the workspace creation function, and RLS policies.
3. Open **Project Settings → API** (or **Connect**) and copy the **Project URL** and **publishable key** into `supabase/config.js`. The publishable key is intended for browser use. Never put a `service_role` or `sb_secret_` key in the website.

## 2. Configure email sign-in and website redirects

1. In **Authentication → Sign In / Providers**, enable **Email**.
2. In **Authentication → URL Configuration**, set **Site URL** to the website's origin, for example `https://your-site.example`.
3. Add the exact website origin to **Redirect URLs**. During local development, add the local server origin too, such as `http://localhost:5500`.
4. Keep email confirmation enabled for a public registration form. After registration, users must confirm the email Supabase sends before they can sign in. Configure custom SMTP before broad use so messages are delivered reliably.

## 3. Publish the website

1. Deploy the project files as a static website using a host such as Netlify, Cloudflare Pages, or Vercel. Keep the `supabase` folder and `supabase/config.js` alongside `index.html`.
2. Open the site's HTTPS URL. To use it from more than one device, use this hosted URL rather than opening the local HTML file.
3. Add this exact HTTPS origin to Supabase **Authentication → URL Configuration → Redirect URLs**, and use it as the **Site URL**. Add each local development origin separately if needed.

## 4. Create the first administrator and shared workspace

1. Run the website over HTTP/HTTPS (not by opening `index.html` as a `file://` URL).
2. On the sign-in page, enter your email and a password of at least 8 characters, then select **Create account with email**. Confirm the email if prompted, then sign in.
3. The first account has no organization yet. Enter your company name and select **Create workspace**. This creates its shared database workspace and assigns the first account the `Administrator` role.

## 5. Enable GitHub sign-in (optional)

GitHub sign-in is handled by Supabase Auth; the website never receives a GitHub client secret.

1. On GitHub, open **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Set **Homepage URL** to your website origin. For **Authorization callback URL**, use the callback shown in Supabase under **Authentication → Sign In / Providers → GitHub**. It has this form: `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Register the OAuth App, copy its **Client ID**, and generate a **Client secret**.
4. In Supabase, open **Authentication → Sign In / Providers → GitHub**, enable the provider, enter the Client ID and Client secret, then save.
5. Make sure the website origin is in Supabase **Authentication → URL Configuration → Redirect URLs**. The app's **Continue with GitHub** button then redirects back to the app after GitHub authentication.

## 6. Add team members to the same workspace

Each colleague first creates an account in the app with email, or signs in with GitHub. If email confirmation is enabled, they must confirm the email. Their account is not allowed to read the company workspace until an administrator adds a membership.

In Supabase **Authentication → Users**, confirm the colleague's account exists. Then open **SQL Editor** and run this query, replacing both email addresses and choosing a role:

```sql
insert into public.organization_members (organization_id, user_id, role)
select admin_membership.organization_id, colleague.id, 'Reservation Agent'
from auth.users as owner_user
join public.organization_members as admin_membership
  on admin_membership.user_id = owner_user.id
join auth.users as colleague
  on lower(colleague.email) = lower('colleague@example.com')
where lower(owner_user.email) = lower('admin@example.com')
  and admin_membership.role = 'Administrator'
on conflict (organization_id, user_id) do nothing;
```

Use one of `Administrator`, `Reservation Agent`, `Accountant`, or `View Only`. The query adds the colleague to the administrator's organization. They can then sign in from any device and see the same workspace. It inserts no row if either email is not registered or the named admin is not an organization administrator.

For a private company system, you can turn off public email sign-ups after the team accounts have been created. Create future accounts with **Authentication → Users → Add user / Invite user**, then add their organization membership with the SQL above. Keep GitHub sign-ups enabled only if you intend to accept new GitHub accounts.

## How the shared database works

The existing app data model is stored as one JSON value in `public.app_workspaces`, with one row per organization. The app fetches that row after sign-in and saves edits back to Supabase. RLS checks the signed-in user's organization membership for every workspace read and write. A publishable key is safe to use in the browser because the database policies enforce access; a secret/service-role key is not safe in client code.

When the first organization is created on a browser that has earlier demo-mode data, that browser's data seeds the new empty workspace. Once Supabase has workspace data, the shared database replaces browser cache on sign-in.

This first shared version can overwrite a simultaneous edit if two people save the whole workspace at nearly the same time. Before high-volume production use, split the JSON workspace into separate tables with per-record permissions and audit history.
