"use client";

import Link from "next/link";
import Image from "next/image";
import { EmptyState, Panel } from "@/components/academic-ui";
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

  const statValue = (value: string | number) =>
    authLoading || !userId ? "—" : value;

  return (
    <div className="page-stack dashboard-page">
      <header className="dashboard-welcome">
        <div className="dashboard-welcome-copy">
          <p className="dashboard-date">
            {today
              ? formatDate(today, { weekday: "long", month: "long", day: "numeric" })
              : "Your study space"}
          </p>
          <h1>{userId ? "Welcome back." : "Welcome to your study space."}</h1>
          <p>
            {userId
              ? "Small, steady steps make a big difference. Here’s what’s ahead."
              : "Make a simple plan for your next study session."}
          </p>
        </div>
        <div className="dashboard-welcome-actions">
          <div className="dashboard-companion-card">
            <Image
              alt="Byte the red panda, Newton the cat, and Ada the axolotl"
              className="dashboard-companion-art"
              height={576}
              src="/images/study-companions.png"
              width={1024}
            />
            <span>
              <strong>Study companions</strong>
              <small>Byte · Newton · Ada</small>
            </span>
          </div>
          {experimentConnected && (
            <span className="planner-style-badge">
              <MaterialIcon name={isSmart ? "auto_awesome" : "edit_note"} size={16} />
              {isSmart ? "Smart schedule" : "Plan it yourself"}
            </span>
          )}
          <Link className="button-primary" href="/study-planner">
            <MaterialIcon name="add" size={17} />
            Make a study plan
          </Link>
        </div>
      </header>

      <div className="student-stats">
        <article className="student-stat">
          <span className="student-stat-icon indigo"><MaterialIcon name="menu_book" size={19} /></span>
          <div><span>Study plans</span><strong>{statValue(tasks.length)}</strong></div>
        </article>
        <article className="student-stat">
          <span className="student-stat-icon peach"><MaterialIcon name="event" size={19} /></span>
          <div><span>Upcoming deadlines</span><strong>{statValue(upcoming.length)}</strong></div>
        </article>
        <article className="student-stat">
          <span className="student-stat-icon mint"><MaterialIcon name="task_alt" size={19} /></span>
          <div><span>Sessions completed</span><strong>{statValue(progress.completedSessions.length)}</strong></div>
        </article>
        <article className="student-stat">
          <span className="student-stat-icon lavender"><MaterialIcon name="schedule" size={19} /></span>
          <div><span>Study time</span><strong>{statValue(`${(progress.completedMinutes / 60).toFixed(1)}h`)}</strong></div>
        </article>
      </div>

      <div className="command-grid">
        <div className="command-primary-column">
          <Panel
            className="priority-panel"
            eyebrow="YOUR NEXT FOCUS SESSION"
            title={prioritySession?.title ?? "No session planned for today"}
            action={todaySessions.length > 0 ? <span className="status-pill">{todaySessions.length} today</span> : undefined}
          >
            {prioritySession ? (
              <>
                <div className="priority-meta">
                  <span className="meta-chip"><MaterialIcon name="schedule" size={15} /> {prioritySession.duration_minutes} min</span>
                  <span className="meta-chip"><MaterialIcon name="calendar_month" size={15} /> {formatDate(prioritySession.scheduled_date, { weekday: "short", month: "short", day: "numeric" })}</span>
                  <span className={`status-pill ${prioritySession.status === "completed" ? "success" : prioritySession.status === "skipped" ? "warning" : ""}`}>
                    {prioritySession.status === "completed" ? "Completed" : prioritySession.status === "skipped" ? "Skipped" : "Up next"}
                  </span>
                </div>
                <div className="priority-progress">
                  <div className="priority-progress-labels">
                    <span>{prioritySession.status === "completed" ? "Nice work — this session is done" : "Ready when you are"}</span>
                  </div>
                  <div className="progress-track">
                    <div className={`progress-fill${prioritySession.status === "completed" ? " complete" : ""}`} style={{ width: prioritySession.status === "completed" ? "100%" : "0%" }} />
                  </div>
                </div>
                <button
                  className={prioritySession.status === "completed" ? "button-secondary" : "button-primary"}
                  onClick={() => void updateSessionStatus(prioritySession)}
                >
                  {prioritySession.status === "completed"
                    ? <><MaterialIcon name="undo" size={16} /> Undo completion</>
                    : <><MaterialIcon name="check_circle" size={16} /> Mark as complete</>}
                </button>
              </>
            ) : (
              <EmptyState
                title={sessionsLoading ? "Loading your schedule" : "You have room for a fresh start"}
                description={sessionsLoading ? "Your study sessions are being retrieved." : "There’s no study block scheduled for today. Make a plan when you’re ready."}
                action={<Link className="button-primary" href="/study-planner"><MaterialIcon name="auto_awesome" size={16} /> Plan a study session</Link>}
              />
            )}
          </Panel>

          <Panel
            className="deadline-panel"
            eyebrow="COMING UP"
            title="Your deadlines"
            action={<Link className="text-link" href="/study-planner">Add a plan <MaterialIcon name="arrow_forward" size={15} /></Link>}
          >
            {!userId ? (
              <EmptyState title="Sign in to see your plans" description="Your saved deadlines will appear here." />
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
                            {daysLeft === 0 ? "Due today" : daysLeft === 1 ? "Due tomorrow" : formatDate(task.deadline, { weekday: "short", month: "short", day: "numeric" })}
                          </span>
                          {daysLeft !== null && daysLeft > 1 && <span className="deadline-time-left">{daysLeft} days left</span>}
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
                title={tasks.length ? "No upcoming deadlines" : "Nothing on the calendar yet"}
                description={tasks.length ? "Your saved plans do not have future deadlines." : "Add a subject and due date to start organizing your study time."}
                action={<Link className="button-secondary" href="/study-planner">Create a plan <MaterialIcon name="arrow_forward" size={15} /></Link>}
              />
            )}
          </Panel>

          <Panel
            className="workload-panel"
            eyebrow="YOUR WEEK"
            title="Study rhythm"
            action={<Link className="text-link" href="/timeline">Open calendar <MaterialIcon name="arrow_forward" size={15} /></Link>}
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
                      <span className="workload-day-name">{dayName(date)}</span>
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
              <EmptyState title="Your study rhythm will grow here" description="Scheduled sessions will appear once you create a study plan." />
            )}
            {sessions.length > 0 && (
              <div className="chart-legend">
                <span><i className="legend-lime" /> Planned</span>
                <span><i className="legend-violet" /> Completed</span>
              </div>
            )}
          </Panel>
        </div>

        <aside className="command-side-column">
          <Panel className="overview-panel" eyebrow="AT A GLANCE" title="Your progress">
            <div className="snapshot-row">
              <span className="snapshot-icon"><MaterialIcon name="event" size={18} /></span>
              <div><strong>{userId ? upcoming.length : "—"}</strong><span>Upcoming deadlines</span></div>
            </div>
            <div className="snapshot-row">
              <span className="snapshot-icon violet"><MaterialIcon name="trending_up" size={18} /></span>
              <div><strong>{progress.completionRate === null ? "—" : `${progress.completionRate}%`}</strong><span>Sessions completed</span></div>
            </div>
            <div className="snapshot-row">
              <span className="snapshot-icon amber"><MaterialIcon name="local_fire_department" size={18} filled /></span>
              <div><strong>{progress.currentStreak}</strong><span>Day streak</span></div>
            </div>
            <div className="snapshot-footnote">
              <span>{userId ? `Completed ${progress.completedSessions.length} of ${sessions.length} sessions` : "Sign in to track your progress"}</span>
              {progress.completionRate !== null && (
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progress.completionRate}%` }} />
                </div>
              )}
            </div>
          </Panel>

          <Panel className="signals-panel" eyebrow="A HELPFUL NEXT STEP" title="Keep it manageable">
            <div className="signal-note">
              <span className="signal-note-icon"><MaterialIcon name="lightbulb" size={17} /></span>
              <div><p>{insight}</p></div>
            </div>
            {overdue.length > 0 && (
              <div className="signal-note urgent">
                <span className="signal-note-icon"><MaterialIcon name="event_busy" size={17} /></span>
                <div><p>{overdue.length} saved {overdue.length === 1 ? "plan has" : "plans have"} a past due date.</p></div>
              </div>
            )}
            {sessions.some((session) => session.status === "skipped") && (
              <div className="signal-note">
                <span className="signal-note-icon"><MaterialIcon name="schedule" size={17} /></span>
                <div><p>{sessions.filter((session) => session.status === "skipped").length} skipped session(s) are still in your calendar.</p></div>
              </div>
            )}
            <Link className="panel-footer-link" href="/performance">See your progress <MaterialIcon name="arrow_forward" size={15} /></Link>
          </Panel>

          {sessions.some((session) => session.status === "skipped") && (
            <Panel className="recovery-panel" eyebrow="A GENTLE RESET" title="Pick up where you left off">
              <p className="panel-copy">Skipped sessions stay visible in your calendar. Rescheduling them isn’t available yet.</p>
              <Link className="panel-footer-link" href="/timeline">Review calendar <MaterialIcon name="arrow_forward" size={15} /></Link>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}
