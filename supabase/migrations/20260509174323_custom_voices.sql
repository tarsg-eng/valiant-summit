create table public.custom_voices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  voice_id text not null,
  name text not null,
  description text not null,
  created_at timestamptz default now()
);

alter table public.custom_voices enable row level security;

create policy "Users can manage own voices"
  on public.custom_voices for all using (auth.uid() = user_id);

grant select, insert, update, delete on public.custom_voices to authenticated;
