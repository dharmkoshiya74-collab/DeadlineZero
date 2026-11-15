"use client";

import Link from "next/link";
import { EmptyState, MonoLabel, Panel } from "@/components/academic-ui";
import { MaterialIcon } from "@/components/material-icon";
import { useWorkspace } from "@/lib/workspace-context";
import {
  calculateProgress,
  dateFromKey,
  formatDate,
  getDateKey,
  getWeekDates,
} from "@/lib/study-utils";

function dayName(date: Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en", options ?? { weekday: "short" }).format(date);
}

export function CommandCenter() {
  const {
    tasks,
    sessions,
    userId,
    authLoading,
    sessionsLoading,
    today,
    isSmart,
    experimentConnected,
    updateSessionStatus,
  } = useWorkspace();
  const progress = calculateProgress(sessions, today);
  const upcoming = tasks
    .filter((task) => today && task.deadline >= today)
    .sort((left, right) => left.deadline.localeCompare(right.deadline));
  const overdue = tasks.filter((task) => today && task.deadline < today);
  const todaySessions = sessions.filter(
    (session) => session.scheduled_date === today,
  );
  const prioritySession =
    todaySessions.find((session) => session.status === "pending") ??
    todaySessions[0];
  const weekDates = today ? getWeekDates(dateFromKey(today)) : [];
  const maxMinutes = Math.max(
    60,
    ...weekDates.map((date) =>
      sessions
        .filter((session) => session.scheduled_date === getDateKey(date))
        .reduce((sum, session) => sum + session.duration_minutes, 0),
    ),
  );

  const insight = upcoming[0]
    ? `Your next saved deadline is ${upcoming[0].subject}, due ${formatDate(upcoming[0].deadline, { month: "short", day: "numeric" })}.`
    : tasks.length
      ? "All saved deadlines are in the past. Review your plans or add a new target."
      : "Create a study plan to see deadline and schedule signals here.";

  return (
    <div className="page-stack">
      <div className="telemetry-strip">
        <div className="telemetry-main">
          <span className={`status-dot${userId ? " online" : ""}`} />
          <MonoLabel>{authLoading ? "CHECKING SESSION" : userId ? "ACCOUNT SESSION ACTIVE" : "SIGN IN TO SYNC"}</MonoLabel>
          <span className="telemetry-divider">/</span>
          <span className="telemetry-detail">
            {sessionsLoading
              ? "Loading study records…"
              : `${tasks.length} plans · ${sessions.length} scheduled sessions`}
          </span>
        </div>
        <div className="telemetry-secondary">
          <span>{overdue.length} overdue {overdue.length === 1 ? "deadline" : "deadlines"}</span>
          <span className="telemetry-divider">/</span>
          <span>{experimentConnected ? "EXPERIMENT ASSIGNMENT SYNCED" : "EXPERIMENT NOT ENROLLED"}</span>
        </div>
      </div>

      <section className="command-hero">
        <div className="hero-topline">
          <span className="signal-chip">
            <span className="status-dot online" />
            ACADEMIC COMMAND CENTER
          </span>
          <span className="hero-date">
            {today ? formatDate(today, { weekday: "long", month: "long", day: "numeric" }) : "Your study workspace"}
          </span>
        </div>
        <h1>Welcome back<span className="lime-period">.</span></h1>
        <p>
          A clear view of your saved plans, study sessions, and the next deadline
          you have recorded.
        </p>
        <div className="hero-metrics">
          <div className="hero-metric">
            <MonoLabel>STUDY PLANS</MonoLabel>
            <strong>{authLoading ? "—" : tasks.length}</strong>
            <span>Saved to your workspace</span>
          </div>
          <div className="hero-metric">
            <MonoLabel>COMPLETED SESSIONS</MonoLabel>
            <strong>{authLoading ? "—" : progress.completedSessions.length}</strong>
            <span>Out of {sessions.length} scheduled</span>
          </div>
          <div className="hero-metric">
            <MonoLabel>COMPLETED STUDY TIME</MonoLabel>
            <strong>{(progress.completedMinutes / 60).toFixed(1)}<small>h</small></strong>
            <span>From completed sessions</span>
          </div>
          <div className="hero-metric">
            <MonoLabel>PLANNER VARIATION</MonoLabel>
            <strong className="variation-value">{experimentConnected ? (isSmart ? "Smart" : "Traditional") : "—"}</strong>
            <span>{experimentConnected ? "Assigned by Flagsmith" : "No active assignment"}</span>
          </div>
        </div>
        <Link className="hero-corner-link" href="/study-planner" aria-label="Open study planner">
          <MaterialIcon name="arrow_outward" size={17} />
        </Link>
      </section>

      <div className="command-grid">
        <div className="command-primary-column">
          <Panel
            className="priority-panel"
            eyebrow="TODAY’S PRIORITY STUDY BLOCK"
            title={prioritySession?.title ?? "No session scheduled for today"}
            action={<span className="status-pill">{todaySessions.length} TODAY</span>}
          >
            {prioritySession ? (
              <>
                <div className="priority-meta">
                  <span className="meta-chip"><MaterialIcon name="timer" size={13} /> {prioritySession.duration_minutes} MIN</span>
                  <span className="meta-chip"><MaterialIcon name="calendar_today" size={13} /> {formatDate(prioritySession.scheduled_date, { weekday: "short", month: "short", day: "numeric" })}</span>
                  <span className={`status-pill ${prioritySession.status === "completed" ? "success" : prioritySession.status === "skipped" ? "warning" : ""}`}>
                    {prioritySession.status}
                  </span>
                </div>
                <div className="priority-progress">
                  <div className="priority-progress-labels">
                    <MonoLabel>SESSION STATUS</MonoLabel>
                    <span>{prioritySession.status === "completed" ? "Logged as complete" : "Ready when you are"}</span>
                  </div>
                  <div className="progress-track">
                    <div className={`progress-fill${prioritySession.status === "completed" ? " complete" : ""}`} style={{ width: prioritySession.status === "completed" ? "100%" : "0%" }} />
                  </div>
                </div>
                <button
                  className={prioritySession.status === "completed" ? "button-secondary" : "button-primary"}
                  onClick={() => void updateSessionStatus(prioritySession)}
                >
                  {prioritySession.status === "completed" ? <><MaterialIcon name="check" size={15} /> Undo completion</> : <><MaterialIcon name="check_circle" size={15} /> Complete session</>}
                </button>
              </>
            ) : (
              <EmptyState
                title={sessionsLoading ? "Loading your schedule" : "Your day is open"}
                description={sessionsLoading ? "Your study sessions are being retrieved." : "No study session is scheduled for today. Build a plan to organize your next study block."}
                action={<Link className="button-primary" href="/study-planner"><MaterialIcon name="auto_awesome" size={15} /> Open Study Planner</Link>}
              />
            )}
          </Panel>

          <Panel
            className="deadline-panel"
            eyebrow="DEADLINE RADAR"
            title="Upcoming plans"
            action={<Link className="text-link" href="/study-planner">New plan <MaterialIcon name="arrow_outward" size={14} /></Link>}
          >
            {!userId ? (
              <EmptyState title="Sign in to load your plans" description="Your deadlines will appear here after you sign in." />
            ) : upcoming.length ? (
              <div className="deadline-list">
                {upcoming.slice(0, 4).map((task) => {
                  const daysLeft = today
                    ? Math.round((dateFromKey(task.deadline).getTime() - dateFromKey(today).getTime()) / 86400000)
                    : null;
                  return (
                    <div className="deadline-row" key={task.id}>
                      <span className={`deadline-accent${daysLeft !== null && daysLeft <= 1 ? " critical" : ""}`} />
                      <div className="deadline-copy">
                        <div className="deadline-meta">
                          <span className={`deadline-chip${daysLeft !== null && daysLeft <= 1 ? " critical" : ""}`}>
                            {daysLeft === 0 ? "DUE TODAY" : daysLeft === 1 ? "DUE TOMORROW" : formatDate(task.deadline, { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}
                          </span>
                          {daysLeft !== null && <MonoLabel>{daysLeft < 0 ? "OVERDUE" : `${daysLeft}D LEFT`}</MonoLabel>}
                        </div>
                        <strong>{task.subject}</strong>
                      </div>
                      <span className="deadline-date">{formatDate(task.deadline, { month: "short", day: "numeric" })}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title={tasks.length ? "No future deadlines" : "No plans yet"}
                description={tasks.length ? "Your saved plans do not have future deadlines." : "Add a subject and deadline to start building your study workspace."}
                action={<Link className="button-secondary" href="/study-planner">Create a plan <MaterialIcon name="arrow_outward" size={14} /></Link>}
              />
            )}
          </Panel>

          <Panel
            className="workload-panel"
            eyebrow="SCHEDULED STUDY TIME"
            title="Weekly workload"
            action={<MonoLabel>PLANNED MINUTES BY DAY</MonoLabel>}
          >
            {sessions.length ? (
              <div className="workload-chart" aria-label="Scheduled study minutes by day this week">
                {weekDates.map((date) => {
                  const key = getDateKey(date);
                  const daySessions = sessions.filter((session) => session.scheduled_date === key);
                  const minutes = daySessions.reduce((sum, session) => sum + session.duration_minutes, 0);
                  const done = daySessions.filter((session) => session.status === "completed").reduce((sum, session) => sum + session.duration_minutes, 0);
                  return (
                    <div className="workload-day" key={key}>
                      <MonoLabel>{dayName(date).toUpperCase()}</MonoLabel>
                      <div className="workload-track" title={`${minutes} scheduled minutes; ${done} completed`}>
                        <div
                          className={`workload-bar${key === today ? " is-today" : ""}`}
                          style={{ height: `${Math.max(minutes ? 5 : 0, (minutes / maxMinutes) * 100)}%` }}
                        >
                          <span style={{ height: minutes ? `${(done / minutes) * 100}%` : "0%" }} />
                        </div>
                      </div>
                      <strong>{minutes ? `${(minutes / 60).toFixed(1)}h` : "—"}</strong>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No session data yet" description="Once study sessions are scheduled, this matrix will show your actual planned workload." />
            )}
            {sessions.length > 0 && (
              <div className="chart-legend">
                <span><i className="legend-lime" /> Scheduled</span>
                <span><i className="legend-violet" /> Completed portion</span>
              </div>
            )}
          </Panel>
        </div>

        <aside className="command-side-column">
          <Panel className="overview-panel" eyebrow="WORKSPACE SNAPSHOT" title="Study overview">
            <div className="snapshot-row">
              <span className="snapshot-icon"><MaterialIcon name="checklist" size={17} /></span>
              <div><strong>{upcoming.length}</strong><span>Upcoming deadlines</span></div>
              <MaterialIcon name="arrow_outward" size={15} className="snapshot-arrow" />
            </div>
            <div className="snapshot-row">
              <span className="snapshot-icon violet"><MaterialIcon name="trending_up" size={17} /></span>
              <div><strong>{progress.completionRate === null ? "—" : `${progress.completionRate}%`}</strong><span>Session completion</span></div>
              <MaterialIcon name="arrow_outward" size={15} className="snapshot-arrow" />
            </div>
            <div className="snapshot-row">
              <span className="snapshot-icon amber"><MaterialIcon name="local_fire_department" size={17} filled /></span>
              <div><strong>{progress.currentStreak}</strong><span>Current day streak</span></div>
              <span className="snapshot-suffix">DAYS</span>
            </div>
            <div className="snapshot-footnote">
              <span>Completed {progress.completedSessions.length} of {sessions.length} sessions</span>
              {progress.completionRate !== null && (
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progress.completionRate}%` }} />
                </div>
              )}
            </div>
          </Panel>

          <Panel className="signals-panel" eyebrow="BASED ON YOUR RECORDS" title="Study signals">
            <div className="signal-note">
              <span className="signal-note-icon"><MaterialIcon name="my_location" size={16} /></span>
              <div><MonoLabel>NEXT DEADLINE</MonoLabel><p>{insight}</p></div>
            </div>
            {overdue.length > 0 && (
              <div className="signal-note urgent">
                <span className="signal-note-icon"><MaterialIcon name="shield" size={16} /></span>
                <div><MonoLabel>NEEDS REVIEW</MonoLabel><p>{overdue.length} saved {overdue.length === 1 ? "plan has" : "plans have"} a past deadline.</p></div>
              </div>
            )}
            {sessions.some((session) => session.status === "skipped") && (
              <div className="signal-note">
                <span className="signal-note-icon"><MaterialIcon name="schedule" size={16} /></span>
                <div><MonoLabel>SKIPPED SESSIONS</MonoLabel><p>{sessions.filter((session) => session.status === "skipped").length} session(s) are marked skipped. Review them in your timeline.</p></div>
              </div>
            )}
            <Link className="panel-footer-link" href="/performance">View performance data <MaterialIcon name="arrow_outward" size={14} /></Link>
          </Panel>

          <Panel className="experiment-panel" eyebrow="FLAGSMITH EXPERIMENT" title="Planner assignment">
            <div className="experiment-key">
              <MonoLabel>FEATURE FLAG</MonoLabel>
              <code>study_planner_experience_v2</code>
            </div>
            <div className="experiment-key">
              <MonoLabel>YOUR VARIATION</MonoLabel>
              <strong className={experimentConnected ? "variation-live" : ""}>
                {experimentConnected ? (isSmart ? "smart_planner" : "traditional_planner") : "Not enrolled / unavailable"}
              </strong>
            </div>
            <div className="experiment-key">
              <MonoLabel>CONVERSION EVENT</MonoLabel>
              <code>study_plan_created</code>
            </div>
            <div className="experiment-status">
              <span className={`status-dot${experimentConnected ? " online" : ""}`} />
              {experimentConnected ? "Assigned variation active" : "No experiment participant assignment"}
            </div>
          </Panel>

          <Panel className="recovery-panel" eyebrow="SESSION RECOVERY" title="Review your schedule">
            {sessions.some((session) => session.status === "skipped") ? (
              <p className="panel-copy">Skipped sessions remain visible in your timeline. Rescheduling is not currently supported.</p>
            ) : (
              <p className="panel-copy">No recovery actions are available unless a session is explicitly marked skipped.</p>
            )}
            <Link className="panel-footer-link" href="/timeline">Open timeline <MaterialIcon name="arrow_outward" size={14} /></Link>
          </Panel>
        </aside>
      </div>

      <div className="bottom-status-strip">
        <span><span className={`status-dot${userId ? " online" : ""}`} /> Records loaded from your workspace</span>
        <span>{sessionsLoading ? "SYNCING SESSION DATA" : `${sessions.length} SESSION RECORDS`}</span>
      </div>
    </div>
  );
}
