# DeadlineZero — implement the exact Google Stitch UI in the real Next.js app

You are editing the existing DeadlineZero repository on branch `ui/stitch-obsidian-redesign`.

## Non-negotiable objective
Rebuild the actual working application UI to closely match the supplied Google Stitch HTML screens and PNG references. Do NOT merely recolor the current dashboard. Do NOT append another global CSS override. The target is a structural React/Next.js implementation: matching page composition, navigation, top command bar, grid geometry, information density, typography, component shapes, charts, timeline, panels, and interactions.

## Source of truth
The exact Stitch references are in:
`design-reference/stitch_deadlinezero_ui_redesign/`

Read all five `code.html` files and `obsidian_scholastic/DESIGN.md` before coding:
- `command_center_academic_os/code.html` and `screen.png`
- `study_planner_flagsmith_a_b_optimized/code.html` and `screen.png`
- `timeline_calendar_academic_os/code.html` and `screen.png`
- `performance_intelligence_academic_os/code.html` and `screen.png`
- `ai_assistant_academic_os/code.html` and `screen.png`
- `obsidian_scholastic/DESIGN.md`

Treat these exact HTML and PNG files as the visual specification. Match the design closely, but adapt fake/demo content to real DeadlineZero data. Do not copy fictitious Stanford, Spring 2025, Alex Vance, GPA, course names, or fake experiment counts/results.

## Existing application source
Inspect and preserve:
- `app/page.tsx`
- `app/globals.css`
- `app/layout.tsx`
- `lib/supabase.ts`
- existing API routes and components

Current app uses Next.js App Router, React, TypeScript, Tailwind, Supabase, Flagsmith, and an AI assistant API. The current dashboard is a single-page client component. You may refactor into reusable components and routes, but retain the existing data and integration behavior.

## Required UI structure
Implement a real application shell:
- Fixed left rail matching Stitch width, dark surface, brand lockup, compact nav icons/labels, active states, bottom connection/user status.
- Compact top command bar matching Stitch height, workspace breadcrumb/term area, real experiment variation badge, quick command affordance only if implemented, focus action only if functional, notifications only if functional, user menu.
- Main content uses Stitch's dense editorial grid and proportions, not the current centered generic card grid.
- Use Geist for UI and JetBrains Mono for telemetry/technical labels where available.
- Use the exact Obsidian Scholastic color tokens and typography/spacing/radius rules from DESIGN.md.
- Responsive mobile navigation and tablet layouts; no overflow or clipped controls.
- All links and controls must work. No dead navigation.

Implement these five screens with the actual Stitch structure:
1. Command Center: status/telemetry strip, large editorial greeting/overview, compact metric row, today's priority study block, upcoming assignment/deadline radar, workload heat matrix, missed-session recovery if supported, and right-side campus/insights/experiment panels. Replace campus-only widgets with useful real student information where needed.
2. Study Planner: match its own Stitch screen layout, include Smart and Traditional variants, subject/task, deadline, duration, difficulty/priority/available time, real generated schedule preview, and create/save actions.
3. Timeline & Calendar: match the supplied weekly timeline/calendar design; real sessions and deadlines, status labels, date navigation, and completion/undo actions.
4. Performance Intelligence: match the supplied analytics screen; use real calculations for study hours, completion, consistency, streak, subject breakdown and trends. Honest empty states when there is insufficient data. Never fabricate analytics.
5. AI Assistant: match the supplied research/copilot interface; preserve the existing API route, conversation behavior and loading/error states. Do not invent assistant capabilities.

Settings must be a real usable section/page, not a dead anchor. Only expose settings that are genuinely implemented.

## Preserve business logic exactly
Do not remove or weaken:
- Supabase auth/session lifecycle and sign-out.
- Existing `study_plans` reads/writes and schema.
- Existing `study_sessions` reads/writes, completion/undo behavior.
- Current Smart Planner scheduling calculations and Traditional Planner behavior.
- Flagsmith initialization, identity, `study_planner_experience_v2` experiment, current assigned variation, exposure behavior, and `study_plan_created` conversion event tracking.
- Existing AI assistant API integration.

Do not modify experiment allocation, feature flag configuration, historical data, or assignment logic. Do not hardcode Smart/Traditional; use the real Flagsmith assignment. Do not count forced assignments as valid participants. Never fake experiment results or claim statistical significance.

## Implementation approach
1. First inspect the entire current source and all Stitch references.
2. Make a component/page map and data-flow map.
3. Implement one screen at a time, starting with the Stitch Command Center.
4. Keep current business logic and move it into reusable hooks/helpers only if behavior remains identical.
5. Add the other four screens and functional navigation.
6. Remove obsolete styling only after replacement UI is in place; avoid duplicate conflicting CSS.
7. Check keyboard navigation, focus, contrast, labels, reduced motion, and responsive breakpoints.
8. Run `npx tsc --noEmit`, lint if configured, and `npm run build`.
9. Fix errors caused by your changes. Do not claim runtime flows work unless actually tested.

## Safety / workflow
- Work only on `ui/stitch-obsidian-redesign`.
- Before editing, inspect `git status`; do not discard user changes.
- Make a timestamped backup or a Git commit before large edits.
- Never edit `.env.local`, expose secrets, or commit credentials.
- Do not run `git reset --hard`, `git clean`, or overwrite the user's working tree blindly.
- Do not add unnecessary dependencies.
- Do not replace real backend data with static demo data.
- Do not stop after a CSS-only change or a static mockup.

## Definition of done
The actual local Next.js app visually resembles the five supplied Stitch screens, at desktop and mobile sizes; navigation works; real Supabase data flows remain intact; both real Flagsmith variations remain correctly assigned/tracked; AI chat remains connected; TypeScript and production build pass. Provide a concise list of changed files and honest test results.
