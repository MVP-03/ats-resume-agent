-- Run this once in your Supabase SQL Editor (Dashboard → SQL Editor)
create table if not exists ats_applications (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role text not null,
  status text not null default 'wishlist'
    check (status in ('wishlist','applied','screen','interview','offer','rejected')),
  ats_score integer,
  job_url text,
  notes text,
  salary_range text,
  applied_date date,
  resume_id uuid,
  created_at timestamptz default now()
);
