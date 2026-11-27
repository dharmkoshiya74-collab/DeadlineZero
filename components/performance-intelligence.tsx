"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { EmptyState, MonoLabel, PageHeading, Panel } from "@/components/academic-ui";
import { ExperimentReadout } from "@/components/experiment-readout";
import { MaterialIcon } from "@/components/material-icon";
import { useWorkspace } from "@/lib/workspace-context";
import { calculateProgress, dateFromKey, formatDate, getDateKey } from "@/lib/study-utils";

type Range = "7d" | "30d" | "all";

const rangeOptions: { value: Range; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

export function PerformanceIntelligence() {
  const { tasks, sessions, userId, sessionsLoading, today } = useWorkspace();
  const [range, setRange] = useState<Range>("30d");
  const filteredSessions = useMemo(() => {
    if (range === "all" || !today) return sessions;
    const cutoff = dateFromKey(today);
    cutoff.setDate(cutoff.getDate() - (range === "7d" ? 6 : 29));
    const cutoffKey = getDateKey(cutoff);
    return sessions.filter((session) => session.scheduled_date >= cutoffKey && session.scheduled_date <= today);
  }, [sessions, range, today]);
  const progress = calculateProgress(filteredSessions, today);
  const completed = filteredSessions.filter((session) => session.status === "completed");
  const activeDays = new Set(completed.map((session) => session.scheduled_date)).size;
  const dayWindow = range === "7d" ? 7 : range === "30d" ? 30 : null;
  const consistency = dayWindow === null
    ? null
    : Math.round((activeDays / dayWindow) * 100);
  const subjectStats = tasks
    .map((task) => {
      const taskSessions = filteredSessions.filter((session) => session.plan_id === task.id);
      const done = taskSessions.filter((session) => session.status === "completed");
      const minutes = done.reduce((sum, session) => sum + session.duration_minutes, 0);
      const allMinutes = taskSessions.reduce((sum, session) => sum + session.duration_minutes, 0);
      return {
        subject: task.subject,
        count: taskSessions.length,
        completed: done.length,
        minutes,
        percent: allMinutes ? Math.round((minutes / allMinutes) * 100) : null,
      };
    })
    .filter((item) => item.count > 0 || range === "all")
    .sort((left, right) => right.minutes - left.minutes);

  const chartDays = useMemo(() => {
    if (!today) return [];
    const end = dateFromKey(today);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(end);
      date.setDate(end.getDate() - 6 + index);
      const key = getDateKey(date);
      const daySessions = sessions.filter((session) => session.scheduled_date === key);
      const completedMinutes = daySessions
        .filter((session) => session.status === "completed")
        .reduce((sum, session) => sum + session.duration_minutes, 0);
      const plannedMinutes = daySessions.reduce((sum, session) => sum + session.duration_minutes, 0);
      return { key, date, completedMinutes, plannedMinutes };
    });
  }, [sessions, today]);
  const maxHours = Math.max(
    1,
    ...chartDays.map((day) => day.plannedMinutes / 60),
  );
  const upcomingSessions = sessions.filter(
    (session) =>
      today &&
      session.scheduled_date >= today &&
      session.status === "pending",
  );
  const completedSessionCount = sessions.filter(
    (session) => session.status === "completed",
  ).length;
  const plansByDeadline = [...tasks].sort((left, right) =>
    left.deadline.localeCompare(right.deadline),
  );
  const hasData = filteredSessions.length > 0;

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="YOUR PROGRESS"
        title="See how you’re doing"
        description="A clear picture of your study time, sessions, and consistency."
      />
      <div className="analytics-toolbar">
        <div className="analytics-system-label">
          <span className="status-dot online" />
          <MonoLabel>YOUR STUDY ACTIVITY</MonoLabel>
          <span className="telemetry-divider">/</span>
          <span className="telemetry-detail">Calculated from your saved sessions</span>
        </div>
        <div aria-label="Analytics date range" className="range-switch">
          {rangeOptions.map((option) => (
            <button
              aria-pressed={range === option.value}
              className={range === option.value ? "selected" : ""}
              key={option.value}
              onClick={() => setRange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <ExperimentReadout />

      {userId && !sessionsLoading && (
        <Panel
          className="progress-overview-panel"
          eyebrow="SAVED TO YOUR ACCOUNT"
          title="Your study plans"
          action={<Link className="text-link" href="/study-planner">Add a plan <MaterialIcon name="arrow_forward" size={15} /></Link>}
        >
          <div className="progress-overview-grid">
            <div className="progress-overview-stat">
              <span className="student-stat-icon indigo"><MaterialIcon name="menu_book" size={18} /></span>
              <div><MonoLabel>SAVED PLANS</MonoLabel><strong>{tasks.length}</strong></div>
            </div>
            <div className="progress-overview-stat">
              <span className="student-stat-icon lavender"><MaterialIcon name="schedule" size={18} /></span>
              <div><MonoLabel>UPCOMING SESSIONS</MonoLabel><strong>{upcomingSessions.length}</strong></div>
            </div>
            <div className="progress-overview-stat">
              <span className="student-stat-icon mint"><MaterialIcon name="task_alt" size={18} /></span>
              <div><MonoLabel>SESSIONS COMPLETED</MonoLabel><strong>{completedSessionCount}</strong></div>
            </div>
          </div>
          {plansByDeadline.length ? (
            <div className="progress-plan-list">
              {plansByDeadline.map((plan) => (
                <div className="progress-plan-row" key={plan.id}>
                  <strong>{plan.subject}</strong>
                  <span>{formatDate(plan.deadline, { weekday: "short", month: "short", day: "numeric" })}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="panel-copy">Create a study plan to see your upcoming deadlines here.</p>
          )}
        </Panel>
      )}

      {!userId ? (
        <Panel><EmptyState title="Sign in to view performance" description="Your study analytics are calculated from sessions saved to your account." /></Panel>
      ) : sessionsLoading ? (
        <Panel><EmptyState title="Loading analytics" description="Your study-session records are being retrieved." /></Panel>
      ) : !hasData ? (
        <Panel>
          <EmptyState
            title={tasks.length ? "Your plans are ready" : "Not enough study data yet"}
            description={tasks.length
              ? "Your saved plans appear above. Study time and consistency will update as you complete study sessions."
              : "Complete or schedule a study session to begin building your performance history."}
          />
        </Panel>
      ) : (
        <>
          <div className="analytics-kpis">
            <MetricCard
              eyebrow="STUDY TIME"
              icon={<MaterialIcon name="timelapse" size={20} />}
              value={`${(progress.completedMinutes / 60).toFixed(1)}`}
              suffix="HRS"
              detail={`${(progress.totalScheduledMinutes / 60).toFixed(1)} hours scheduled in this range`}
            />
            <MetricCard
              eyebrow="SESSIONS COMPLETED"
              icon={<MaterialIcon name="verified" size={20} />}
              value={progress.completionRate === null ? "—" : `${progress.completionRate}`}
              suffix={progress.completionRate === null ? "" : "%"}
              detail={`${progress.completedSessions.length} of ${filteredSessions.length} sessions completed`}
              tone="violet"
            />
            <MetricCard
              eyebrow="CONSISTENCY"
              icon={<MaterialIcon name="monitoring" size={20} />}
              value={consistency === null ? `${activeDays}` : `${consistency}`}
              suffix={consistency === null ? "DAYS" : "%"}
              detail={consistency === null ? `${activeDays} active days with completed sessions` : `${activeDays} of ${dayWindow} days had a completed session`}
            />
            <MetricCard
              eyebrow="STUDY STREAK"
              icon={<MaterialIcon name="local_fire_department" size={20} filled />}
              value={`${progress.currentStreak}`}
              suffix="DAYS"
              detail="Consecutive days with a completed session through today"
              tone="amber"
            />
          </div>

          <div className="analytics-main-grid">
            <Panel
              className="velocity-panel"
              eyebrow="RECENT SESSION HISTORY"
              title="Weekly study hours"
              action={<MonoLabel>PLANNED VS COMPLETED</MonoLabel>}
            >
              <div className="chart-legend">
                <span><i className="legend-muted" /> Planned</span>
                <span><i className="legend-lime" /> Completed</span>
              </div>
              <div className="velocity-chart" aria-label="Planned and completed study hours for the last seven days">
                <div className="chart-y-axis" aria-hidden="true">
                  <span>{maxHours.toFixed(0)}h</span><span>{(maxHours / 2).toFixed(0)}h</span><span>0h</span>
                </div>
                <div className="velocity-bars">
                  {chartDays.map((day) => (
                    <div className="velocity-day" key={day.key}>
                      <div className="velocity-bar-area">
                        <div
                          className="velocity-bar planned"
                          title={`${(day.plannedMinutes / 60).toFixed(1)} scheduled hours`}
                          style={{ height: `${(day.plannedMinutes / 60 / maxHours) * 100}%` }}
                        />
                        <div
                          className="velocity-bar completed"
                          title={`${(day.completedMinutes / 60).toFixed(1)} completed hours`}
                          style={{ height: `${(day.completedMinutes / 60 / maxHours) * 100}%` }}
                        />
                      </div>
                      <MonoLabel>{new Intl.DateTimeFormat("en", { weekday: "short" }).format(day.date).toUpperCase()}</MonoLabel>
                      <span className="chart-day-hours">{day.completedMinutes ? `${(day.completedMinutes / 60).toFixed(1)}h` : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="chart-summary">
                <span><MaterialIcon name="trending_up" size={15} /> Last 7 days are based on session dates and durations.</span>
                <strong>{chartDays.reduce((sum, day) => sum + day.completedMinutes, 0) > 0
                  ? `${(chartDays.reduce((sum, day) => sum + day.completedMinutes, 0) / 60).toFixed(1)}h completed`
                  : "No completions in this period"}</strong>
              </div>
            </Panel>

            <Panel
              className="subject-panel"
              eyebrow="SESSION ALLOCATION"
              title="By study plan"
              action={<MonoLabel>{subjectStats.length} PLANS</MonoLabel>}
            >
              {subjectStats.length ? (
                <div className="subject-stat-list">
                  {subjectStats.map((item) => (
                    <div className="subject-stat" key={item.subject}>
                      <div className="subject-stat-heading">
                        <strong>{item.subject}</strong>
                        <MonoLabel>{item.minutes ? `${(item.minutes / 60).toFixed(1)}H DONE` : "NO COMPLETIONS"}</MonoLabel>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${item.percent ?? 0}%` }} />
                      </div>
                      <div className="subject-stat-foot">
                        <span>{item.completed} of {item.count} sessions completed</span>
                        <span>{item.percent === null ? "—" : `${item.percent}%`}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No plan-linked sessions" description="Session breakdown appears when sessions are attached to a saved study plan." />
              )}
            </Panel>
          </div>

          <div className="analytics-secondary-grid">
            <Panel
              className="consistency-panel"
              eyebrow="DAILY RECORDS"
              title="Recent consistency"
              action={<MonoLabel>COMPLETED SESSION DAYS</MonoLabel>}
            >
              <div className="consistency-grid">
                {chartDays.map((day) => {
                  const didStudy = sessions.some(
                    (session) =>
                      session.scheduled_date === day.key &&
                      session.status === "completed",
                  );
                  return (
                    <div className={`consistency-day${didStudy ? " active" : ""}`} key={day.key}>
                      <span>{new Intl.DateTimeFormat("en", { weekday: "short" }).format(day.date).toUpperCase()}</span>
                      <i aria-label={didStudy ? "Completed session" : "No completed session"} />
                      <strong>{new Intl.DateTimeFormat("en", { day: "numeric" }).format(day.date)}</strong>
                    </div>
                  );
                })}
              </div>
              <p className="panel-copy">A day counts when at least one session is marked completed. No prediction or self-reported focus score is included.</p>
            </Panel>

            <Panel className="data-notes-panel" eyebrow="YOUR PROGRESS" title="How these numbers work">
              <div className="data-note"><span className="status-dot online" /><p>Study time totals completed session durations.</p></div>
              <div className="data-note"><span className="status-dot violet" /><p>Completion rate is completed sessions divided by all sessions in the selected range.</p></div>
              <div className="data-note"><span className="status-dot amber" /><p>Consistency and streak use completed-session dates only.</p></div>
              <div className="data-note"><span className="status-dot muted" /><p>Mastery, focus quality, target performance, and cohort comparison are not available in the stored schema.</p></div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  eyebrow,
  icon,
  value,
  suffix,
  detail,
  tone = "lime",
}: {
  eyebrow: string;
  icon: ReactNode;
  value: string;
  suffix: string;
  detail: string;
  tone?: "lime" | "violet" | "amber";
}) {
  return (
    <section className={`metric-card tone-${tone}`}>
      <div className="metric-card-top"><MonoLabel>{eyebrow}</MonoLabel><span>{icon}</span></div>
      <div className="metric-value">{value}<small>{suffix}</small></div>
      <p>{detail}</p>
    </section>
  );
}
