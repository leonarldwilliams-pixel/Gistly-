-- GISTLY database setup. Paste ALL of this into Supabase > SQL Editor > Run.
-- Safe to run once. Uses "gistly_" names so it will not touch WinPot or the music site.

create table if not exists public.gistly_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null default '',
  bio text not null default '' check (char_length(bio) <= 160),
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.gistly_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique,
  sender uuid not null references public.gistly_profiles(id) on delete cascade,
  receiver uuid not null references public.gistly_profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender <> receiver)
);
create index if not exists gistly_messages_sender_idx on public.gistly_messages (sender, created_at desc);
create index if not exists gistly_messages_receiver_idx on public.gistly_messages (receiver, created_at desc);

alter table public.gistly_profiles enable row level security;
alter table public.gistly_messages enable row level security;

-- Profiles: any signed-in person can find others by username; you can only edit your own.
drop policy if exists "profiles read" on public.gistly_profiles;
create policy "profiles read" on public.gistly_profiles for select to authenticated using (true);
drop policy if exists "profiles update own" on public.gistly_profiles;
create policy "profiles update own" on public.gistly_profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Messages: you only see messages you sent or received.
drop policy if exists "messages read own" on public.gistly_messages;
create policy "messages read own" on public.gistly_messages for select to authenticated
  using (sender = auth.uid() or receiver = auth.uid());
drop policy if exists "messages send" on public.gistly_messages;
create policy "messages send" on public.gistly_messages for insert to authenticated
  with check (sender = auth.uid());
drop policy if exists "messages mark read" on public.gistly_messages;
create policy "messages mark read" on public.gistly_messages for update to authenticated
  using (receiver = auth.uid()) with check (receiver = auth.uid());

-- The receiver may only change "read_at", nothing else.
create or replace function public.gistly_lock_message()
returns trigger language plpgsql as $$
begin
  if new.body is distinct from old.body or new.sender is distinct from old.sender
     or new.receiver is distinct from old.receiver or new.client_id is distinct from old.client_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Only read_at can be changed';
  end if;
  return new;
end $$;
drop trigger if exists gistly_lock_message_t on public.gistly_messages;
create trigger gistly_lock_message_t before update on public.gistly_messages
  for each row execute function public.gistly_lock_message();

-- Simple anti-spam: max 30 messages per minute per person.
create or replace function public.gistly_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.gistly_messages
      where sender = new.sender and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Slow down: too many messages';
  end if;
  return new;
end $$;
drop trigger if exists gistly_rate_limit_t on public.gistly_messages;
create trigger gistly_rate_limit_t before insert on public.gistly_messages
  for each row execute function public.gistly_rate_limit();

-- Creates the profile automatically when someone signs up in Gistly.
create or replace function public.gistly_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.raw_user_meta_data ? 'gistly_username' then
    insert into public.gistly_profiles (id, username, display_name)
    values (new.id,
            lower(new.raw_user_meta_data->>'gistly_username'),
            left(coalesce(new.raw_user_meta_data->>'gistly_name',''), 40));
  end if;
  return new;
end $$;
drop trigger if exists gistly_new_user_t on auth.users;
create trigger gistly_new_user_t after insert on auth.users
  for each row execute function public.gistly_new_user();

-- Lets the sign-up screen check if a username is free (works before login).
create or replace function public.gistly_username_free(n text)
returns boolean language sql security definer set search_path = public as $$
  select not exists (select 1 from public.gistly_profiles where username = lower(n));
$$;
grant execute on function public.gistly_username_free(text) to anon, authenticated;

-- Live messages
do $$ begin
  alter publication supabase_realtime add table public.gistly_messages;
exception when duplicate_object then null; end $$;
