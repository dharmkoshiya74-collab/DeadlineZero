# DeadlineZero

### Your Academic Operating System

DeadlineZero helps students turn academic deadlines into achievable study plans. It combines intelligent study scheduling, progress tracking, and an AI academic assistant.

**Team:** Team Vortex  
**Hackathon:** WeMakeDevs Toggle Wars — Track 01: Test Something Real  
**Project:** DeadlineZero

---

## The Problem

Students often struggle to manage multiple subjects, assignments, examinations, and deadlines. Traditional to-do lists do not help students decide how much time to study or recover when they miss a planned session.

## Our Solution

DeadlineZero provides an academic planning workspace that helps students organize their workload and track their progress.

## Features

- **Study Plan Creation:** Create study plans with subjects, estimated study duration, and deadlines.
- **Smart Planner:** Uses daily availability, difficulty, and priority to generate study sessions automatically.
- **Traditional Planner:** Provides a simpler manual planning experience.
- **Study Calendar:** View scheduled study sessions.
- **Progress Tracking:** Track completed sessions and study progress.
- **AI Academic Assistant:** Get answers to academic and study-skills questions, plus a suggested study plan you can review and explicitly add to your workspace.
- **Authentication:** Student accounts and protected dashboard access.
- **A/B Experimentation:** Compare Traditional Planner and Smart Planner using Flagsmith.

## Our Flagsmith Experiment

We are testing the hypothesis:

> Does an intelligent study-planning experience increase successful study-plan creation compared with a traditional planning experience?

| Experiment setting | Configuration |
|---|---|
| Experiment | DeadlineZero Study Planner A/B v2 |
| Feature flag | `study_planner_experience_v2` |
| Control | `traditional_planner` |
| Treatment | `smart_planner` |
| Primary metric | `study_plan_created` |
| Metric type | Occurrence |
| Optimization | Higher is better |

Flagsmith assigns eligible users to the experiment variations. The application records experiment exposure and study-plan creation events.

We will report actual experiment results after collecting sufficient genuine participant data. We will not treat small samples as statistically conclusive.

## Technology Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase Authentication and Database
- Flagsmith Feature Flags and Experimentation
- Groq API for AI assistance

## Getting Started

### Prerequisites

- Node.js
- npm
- A Supabase project
- A Flagsmith environment
- A Groq API key

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd deadlinezero
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and add your own credentials.

Required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID=
GROQ_API_KEY=
```

Never commit `.env.local` or expose server-side API keys.

### 4. Initialize the Supabase database

In the Supabase Dashboard, open **SQL Editor**, paste the contents of
`supabase/migrations/20261115000000_create_study_planner_tables.sql`, and run
it. This creates the study-plan and calendar-session tables, enables
row-level security, and grants authenticated users access only to their own
records.

### 5. Start the development server

```bash
npm run dev
```

Open http://localhost:3000.

### 6. Create a production build

```bash
npm run build
```

## Project Structure

```text
deadlinezero/
├── app/
│   ├── api/
│   ├── login/
│   ├── flagsmith-test/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
├── public/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

*The project structure may evolve as development continues.*

## Experiment Evaluation

We will evaluate the two planner experiences using genuine participant activity.

Primary metric:
- Successful study-plan creation.

Additional product metrics:
- Study sessions completed.
- Schedule adjustments.
- Returning study-plan users.

We will interpret results with sample size and statistical uncertainty in mind.

## Demo

**Live application:** https://deadline-zero-eta.vercel.app

**Demo video:** Add the final demonstration video URL before submission.

## Team

**Team Vortex**

Built for the WeMakeDevs Toggle Wars Hackathon, November 2026.

---

## Project Status

DeadlineZero is an active hackathon project. Features and experiment results are subject to ongoing testing and improvement.
