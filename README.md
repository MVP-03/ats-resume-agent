# ResumeAI — AI-Powered ATS Resume Agent

A full-stack AI dashboard to build, score, tailor, and track job applications — all in one place.

Built with **Next.js 15**, **Groq (LLaMA 3.3 70B)**, **Supabase**, and **Tailwind CSS**.

---

## Features

### Resume Builder
- Fill in your experience, skills, and education
- AI generates a fully ATS-optimized resume in seconds

### ATS Scorer
- Upload a PDF or paste your resume text alongside any job description
- Score out of 100 with a full breakdown:
  - Keyword match (TF-IDF weighted, tech-aware — preserves C++, Node.js, CI/CD, etc.)
  - Contact information checks (email, phone, LinkedIn, GitHub, location)
  - Section completeness (summary, experience, education, skills, certifications, projects)
  - Content quality (action verbs, verb variety, quantified achievements, weak language)
  - ATS formatting (no tables, special characters, emoji, ALL-CAPS)
- Missing vs. matched keyword lists
- Field suggestions: new sections to add based on the specific JD

### AI Coach (Tailor Step)
- Keyword suggestions with *where* and *how* to add them naturally
- Bullet-by-bullet feedback with corrected rewrites and metric placeholders (`[X%]`)
- Power verbs tailored to the role
- Summary improvement tip
- Score before vs. potential score after applying suggestions

### Cover Letter + HR Message
- Human-sounding cover letter — no "I am excited/passionate/thrilled", no hollow phrases
- LinkedIn/HR follow-up message: opens with a hook about the company, connects a real achievement, ends with a sharp low-pressure ask

### Application Tracker
- Kanban board: **Wishlist → Applied → Phone Screen → Interview → Offer → Rejected**
- Drag and drop cards between stages
- Per-card: company avatar, role, ATS score badge, salary range, notes, job URL
- Stats bar: Total, Active, Offers, Response Rate
- Search and filter by stage

### Role Folders
- Save applications by role (e.g. "Senior Engineer at Stripe")
- Sidebar with color-coded ATS score badges per saved resume
- Load any saved application back into the full workflow

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 App Router (TypeScript) |
| AI | Groq SDK — `llama-3.3-70b-versatile` |
| Database | Supabase (PostgreSQL) |
| PDF Parsing | pdfjs-dist (client-side) |
| Styling | Tailwind CSS |
| Deployment | Vercel |

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/MVP-03/ats-resume-agent.git
cd ats-resume-agent
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the root:

```env
GROQ_API_KEY=your_groq_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

- Free Groq API key: [console.groq.com](https://console.groq.com)
- Supabase project: [supabase.com](https://supabase.com)

### 3. Create the database tables

Run this SQL once in your **Supabase Dashboard → SQL Editor**:

```sql
-- Role folders
create table if not exists ats_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Saved resumes per folder
create table if not exists ats_resumes (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references ats_folders(id) on delete cascade,
  label text not null,
  resume_text text,
  job_description text,
  ats_score integer,
  score_data jsonb,
  tailored_text text,
  created_at timestamptz default now()
);

-- Application tracker (Kanban)
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
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
app/
  page.tsx                  # Main dashboard + all flow steps
  tracker/
    TrackerView.tsx          # Kanban application tracker component
  api/
    build-resume/            # AI resume generation
    score/                   # ATS scoring engine
    tailor/                  # AI coaching (structured JSON)
    cover-letter/            # Cover letter + HR message
    folders/                 # Folder CRUD
    resumes/                 # Saved resume CRUD
    resumes/[id]/            # Update / delete a saved resume
    applications/            # Application tracker CRUD
    applications/[id]/       # Update / delete an application
lib/
  ats-scorer.ts             # Full ATS scoring engine (keyword extraction, field checks, field suggestions)
  supabase.ts               # Supabase client + shared types
supabase/
  migrations/               # SQL migration files
public/
  pdf.worker.min.mjs        # pdfjs worker (client-side PDF parsing)
```

---

## Deploying to Vercel

1. Push to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add all four environment variables in Vercel → Settings → Environment Variables
4. Deploy

---

## License

MIT
