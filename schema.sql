-- GrandStay shared workspace schema
-- Run this whole file once in Supabase: SQL Editor > New query.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('Administrator', 'Reservation Agent', 'Accountant', 'View Only')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

-- The current application already has a mature JSON state model. This table is
-- an intentional first migration step; it makes that state shared and secured.
-- Split it into reservations, payments, hotels, etc. in a later migration.
create table if not exists public.app_workspaces (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill profiles for users who signed up before this trigger was installed.
-- The organization_members.user_id foreign key points to profiles.id.
insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;

-- Lets the first signed-in user create the company's workspace from the app.
create or replace function public.create_organization(organization_name text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  new_organization_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if exists (select 1 from public.organization_members where user_id = auth.uid()) then
    raise exception 'This user already belongs to an organization';
  end if;
  insert into public.organizations (name) values (trim(organization_name)) returning id into new_organization_id;
  insert into public.organization_members (organization_id, user_id, role)
  values (new_organization_id, auth.uid(), 'Administrator');
  insert into public.app_workspaces (organization_id) values (new_organization_id);
  return new_organization_id;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists app_workspaces_touch_updated_at on public.app_workspaces;
create trigger app_workspaces_touch_updated_at before update on public.app_workspaces
for each row execute procedure public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.app_workspaces enable row level security;

create policy "Members can view their profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Members can view their memberships" on public.organization_members for select to authenticated using (user_id = auth.uid());
create policy "Members can view their organization" on public.organizations for select to authenticated using (
  exists (select 1 from public.organization_members m where m.organization_id = organizations.id and m.user_id = auth.uid())
);
create policy "Members can read workspace" on public.app_workspaces for select to authenticated using (
  exists (select 1 from public.organization_members m where m.organization_id = app_workspaces.organization_id and m.user_id = auth.uid())
);
create policy "Editors can create workspace" on public.app_workspaces for insert to authenticated with check (
  exists (select 1 from public.organization_members m where m.organization_id = app_workspaces.organization_id and m.user_id = auth.uid() and m.role <> 'View Only')
);
create policy "Editors can update workspace" on public.app_workspaces for update to authenticated using (
  exists (select 1 from public.organization_members m where m.organization_id = app_workspaces.organization_id and m.user_id = auth.uid() and m.role <> 'View Only')
) with check (
  exists (select 1 from public.organization_members m where m.organization_id = app_workspaces.organization_id and m.user_id = auth.uid() and m.role <> 'View Only')
);

grant usage on schema public to authenticated;
grant select on public.profiles, public.organizations, public.organization_members to authenticated;
grant select, insert, update on public.app_workspaces to authenticated;
grant execute on function public.create_organization(text) to authenticated;
