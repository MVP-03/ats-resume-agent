-- ============================================================
-- Add user_id to all tables and enable Row Level Security
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Add user_id column to ats_folders (nullable first, we'll backfill)
ALTER TABLE ats_folders ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Add user_id column to ats_resumes
ALTER TABLE ats_resumes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Add user_id column to ats_applications
ALTER TABLE ats_applications ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Enable Row Level Security on all tables
ALTER TABLE ats_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats_applications ENABLE ROW LEVEL SECURITY;

-- 5. Drop old permissive policies if they exist
DROP POLICY IF EXISTS "Allow all" ON ats_folders;
DROP POLICY IF EXISTS "Allow all" ON ats_resumes;
DROP POLICY IF EXISTS "Allow all" ON ats_applications;

-- 6. Create user-scoped RLS policies for ats_folders
CREATE POLICY "Users manage own folders" ON ats_folders
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. Create user-scoped RLS policies for ats_resumes
CREATE POLICY "Users manage own resumes" ON ats_resumes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8. Create user-scoped RLS policies for ats_applications
CREATE POLICY "Users manage own applications" ON ats_applications
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Done! Each user now only sees and modifies their own data.
