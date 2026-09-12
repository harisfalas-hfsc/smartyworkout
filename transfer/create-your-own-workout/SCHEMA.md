# Database columns the feature needs in Smarty Gym (Old)

## 1. Exercise library (read only)

The builder can only ever use exercises that exist here. Map the old project's
library onto these column names, or add the ones that are missing.

```sql
-- exercises
id                text primary key
name              text not null
body_part         text
target_muscle     text
secondary_muscles text[]   default '{}'
equipment         text
category          text
difficulty        text     -- beginner | intermediate | advanced
movement_pattern  text
body_region       text
description       text
instructions      text[]   default '{}'
gif_path          text
tags              text[]   default '{}'
is_active         boolean  not null default true
```

## 2. Member sessions ("my own workouts")

This is where a built session is saved and read back from. Point it at the table the
old project already uses for a member's own sessions, adding any missing columns.

```sql
-- workouts
id                 uuid primary key default gen_random_uuid()
user_id            uuid not null references auth.users(id) on delete cascade
name               text not null
category           text not null
format             text
focus              text
difficulty_stars   integer not null   -- 1..6 on the six-star scale
difficulty_label   text               -- Beginner | Intermediate | Advanced
duration_min       integer not null
duration_label     text
equipment          text[] not null default '{}'
location           text
mood               text
description_html   text
instructions_html  text
tips_html          text
main_workout       text               -- the session body, with exercise tokens
needs_review       boolean not null default false
review_warnings    text[] not null default '{}'
coach_rationale    text[] not null default '{}'
status             text not null default 'created'
completed_at       timestamptz
created_at         timestamptz not null default now()
updated_at         timestamptz not null default now()
```

Remember, for every new table: grant access to the signed-in role and enable row
security so a member only ever sees their own sessions.

```sql
grant select, insert, update, delete on public.workouts to authenticated;
grant all on public.workouts to service_role;
alter table public.workouts enable row level security;
create policy "own workouts" on public.workouts
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## 3. Optional — only if you want the coach notes and progress comparison

`workout_feedback`, `set_logs` and `workout_results` feed the read-only
recommendation notes and the repeat-session comparison. Leave them out and the
feature still builds sessions perfectly; the notes simply stay quiet.
