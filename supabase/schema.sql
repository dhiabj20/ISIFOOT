-- ISIFOOT database schema
-- Run this file in Supabase SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text not null,
  student_id text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  team_name text,
  notes text,
  status text not null default 'pending_confirmation' check (status in ('pending_confirmation', 'confirmed', 'cancelled')),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  confirmation_token text,
  confirmation_deadline timestamptz,
  confirmed_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists reservations_unique_active_slot
  on public.reservations (date, start_time)
  where status <> 'cancelled';

create table if not exists public.fixtures (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references public.reservations(id) on delete set null,
  date date not null,
  start_time time not null,
  end_time time not null,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  team_a_name text not null default 'Equipe A',
  team_b_name text not null default 'Equipe B',
  team_a_max int not null default 5 check (team_a_max > 0),
  team_b_max int not null default 5 check (team_b_max > 0),
  created_by uuid references public.profiles(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'full', 'cancelled', 'finished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fixture_players (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  team text not null check (team in ('A', 'B')),
  created_at timestamptz not null default now(),
  unique (fixture_id, user_id)
);

create table if not exists public.fixture_messages (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_token text not null,
  platform text not null check (platform in ('android', 'ios')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, device_token)
);

alter table public.reservations
  add column if not exists visibility text not null default 'private';
alter table public.reservations
  add column if not exists confirmation_token text;
alter table public.reservations
  add column if not exists confirmation_deadline timestamptz;
alter table public.reservations
  add column if not exists confirmed_at timestamptz;
alter table public.reservations
  add column if not exists reminder_sent_at timestamptz;
alter table public.reservations
  drop constraint if exists reservations_visibility_check;
alter table public.reservations
  add constraint reservations_visibility_check check (visibility in ('private', 'public'));
alter table public.reservations
  drop constraint if exists reservations_status_check;
alter table public.reservations
  add constraint reservations_status_check check (status in ('pending_confirmation', 'confirmed', 'cancelled'));

alter table public.fixtures
  add column if not exists visibility text not null default 'public';
alter table public.fixtures
  drop constraint if exists fixtures_visibility_check;
alter table public.fixtures
  add constraint fixtures_visibility_check check (visibility in ('public', 'private'));

create index if not exists reservations_confirmation_deadline_idx
  on public.reservations (confirmation_deadline)
  where status = 'pending_confirmation';

create unique index if not exists reservations_confirmation_token_idx
  on public.reservations (confirmation_token)
  where confirmation_token is not null and status = 'pending_confirmation';

create index if not exists fixture_messages_fixture_created_at_idx
  on public.fixture_messages (fixture_id, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.reservations_set_confirmation_fields()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'pending_confirmation' then
    new.confirmation_token = coalesce(new.confirmation_token, encode(gen_random_bytes(24), 'hex'));
    new.confirmation_deadline = coalesce(new.confirmation_deadline, now() + interval '15 minutes');
  else
    new.confirmation_token = null;
    new.confirmation_deadline = null;
  end if;

  return new;
end;
$$;

create or replace function public.confirm_reservation(_reservation_id uuid, _token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  _updated int := 0;
begin
  update public.reservations
     set status = 'confirmed',
         confirmed_at = now(),
         confirmation_token = null,
         confirmation_deadline = null
   where id = _reservation_id
     and user_id = auth.uid()
     and status = 'pending_confirmation'
     and confirmation_token = _token
     and confirmation_deadline > now();

  get diagnostics _updated = row_count;
  return _updated > 0;
end;
$$;

create or replace function public.confirm_reservation_by_token(_reservation_id uuid, _token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  _updated int := 0;
begin
  update public.reservations
     set status = 'confirmed',
         confirmed_at = now(),
         confirmation_token = null,
         confirmation_deadline = null
   where id = _reservation_id
     and status = 'pending_confirmation'
     and confirmation_token = _token
     and confirmation_deadline > now();

  get diagnostics _updated = row_count;
  return _updated > 0;
end;
$$;

create or replace function public.auto_cancel_unconfirmed_reservations()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  _count int;
begin
  update public.reservations
     set status = 'cancelled',
         confirmation_token = null,
         confirmation_deadline = null
   where status = 'pending_confirmation'
     and confirmation_deadline <= now();

  get diagnostics _count = row_count;

  update public.fixtures f
     set status = 'cancelled'
    from public.reservations r
   where f.reservation_id = r.id
     and r.status = 'cancelled'
     and f.status <> 'cancelled';

  return _count;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists reservations_set_updated_at on public.reservations;
create trigger reservations_set_updated_at
before update on public.reservations
for each row execute function public.set_updated_at();

drop trigger if exists reservations_set_confirmation_fields on public.reservations;
create trigger reservations_set_confirmation_fields
before insert or update on public.reservations
for each row execute function public.reservations_set_confirmation_fields();

drop trigger if exists fixtures_set_updated_at on public.fixtures;
create trigger fixtures_set_updated_at
before update on public.fixtures
for each row execute function public.set_updated_at();

drop trigger if exists push_tokens_set_updated_at on public.push_tokens;
create trigger push_tokens_set_updated_at
before update on public.push_tokens
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, username, student_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Utilisateur'),
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8)),
    nullif(new.raw_user_meta_data ->> 'student_id', '')
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    username = excluded.username,
    student_id = excluded.student_id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.reservations enable row level security;
alter table public.fixtures enable row level security;
alter table public.fixture_players enable row level security;
alter table public.fixture_messages enable row level security;
alter table public.push_tokens enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "reservations_select_authenticated" on public.reservations;
create policy "reservations_select_authenticated"
on public.reservations
for select
to authenticated
using (true);

drop policy if exists "reservations_insert_own" on public.reservations;
create policy "reservations_insert_own"
on public.reservations
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "reservations_update_own" on public.reservations;
create policy "reservations_update_own"
on public.reservations
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "fixtures_select_authenticated" on public.fixtures;
create policy "fixtures_select_authenticated"
on public.fixtures
for select
to authenticated
using (visibility = 'public' or created_by = auth.uid());

drop policy if exists "fixtures_insert_creator" on public.fixtures;
create policy "fixtures_insert_creator"
on public.fixtures
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "fixtures_update_creator" on public.fixtures;
create policy "fixtures_update_creator"
on public.fixtures
for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "fixture_players_select_authenticated" on public.fixture_players;
create policy "fixture_players_select_authenticated"
on public.fixture_players
for select
to authenticated
using (true);

drop policy if exists "fixture_players_insert_own" on public.fixture_players;
create policy "fixture_players_insert_own"
on public.fixture_players
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.fixtures f
    where f.id = fixture_id
      and f.visibility = 'public'
      and f.status = 'open'
  )
);

drop policy if exists "fixture_players_delete_own" on public.fixture_players;
create policy "fixture_players_delete_own"
on public.fixture_players
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "fixture_messages_select_member" on public.fixture_messages;
create policy "fixture_messages_select_member"
on public.fixture_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.fixtures f
    where f.id = fixture_messages.fixture_id
      and (
        f.created_by = auth.uid()
        or exists (
          select 1
          from public.fixture_players fp
          where fp.fixture_id = fixture_messages.fixture_id
            and fp.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "fixture_messages_insert_member" on public.fixture_messages;
create policy "fixture_messages_insert_member"
on public.fixture_messages
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.fixtures f
    where f.id = fixture_messages.fixture_id
      and (
        f.created_by = auth.uid()
        or exists (
          select 1
          from public.fixture_players fp
          where fp.fixture_id = fixture_messages.fixture_id
            and fp.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own"
on public.push_tokens
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own"
on public.push_tokens
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own"
on public.push_tokens
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own"
on public.push_tokens
for delete
to authenticated
using (auth.uid() = user_id);

do $$
begin
  begin
    create extension if not exists pg_cron;
  exception
    when others then
      raise notice 'pg_cron extension unavailable in this project/plan.';
  end;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('auto-cancel-unconfirmed-reservations');
    exception
      when others then
        null;
    end;

    perform cron.schedule(
      'auto-cancel-unconfirmed-reservations',
      '* * * * *',
      $job$select public.auto_cancel_unconfirmed_reservations();$job$
    );
  end if;
end;
$$;
