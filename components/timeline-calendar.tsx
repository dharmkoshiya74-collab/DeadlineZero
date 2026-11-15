"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState, MonoLabel, Panel } from "@/components/academic-ui";
import { MaterialIcon } from "@/components/material-icon";
import { useWorkspace } from "@/lib/workspace-context";
import {
  dateFromKey,
  formatDate,
  getDateKey,
  getWeekDates,
  type StudySession,
} from "@/lib/study-utils";

type TimelineMode = "week" | "month" | "agenda" | "gantt";

const viewOptions: {
  id: TimelineMode;
  label: string;
  icon: string;
}[] = [
  { id: "week", label: "Weekly Schedule", icon: "view_week" },
  { id: "month", label: "Monthly Timeline", icon: "calendar_month" },
  { id: "agenda", label: "List Agenda", icon: "format_list_bulleted" },
  { id: "gantt", label: "Gantt View", icon: "waterfall_chart" },
];

function getMonthDates(anchor: Date | null, offset: number) {
  if (!anchor) return [];

  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1, 12);
  const firstVisibleDate = new Date(firstOfMonth);
  firstVisibleDate.setDate(firstVisibleDate.getDate() - ((firstVisibleDate.getDay() + 6) % 7));
  const daysInMonth = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() + 1, 0).getDate();
  const leadingDays = (firstOfMonth.getDay() + 6) % 7;
  const visibleDayCount = Math.ceil((leadingDays + daysInMonth) / 7) * 7;

  return Array.from({ length: visibleDayCount }, (_, index) => {
    const date = new Date(firstVisibleDate);
    date.setDate(firstVisibleDate.getDate() + index);
    return date;
  });
}

export function TimelineCalendar() {
  const { tasks, sessions, userId, sessionsLoading, today, updateSessionStatus } = useWorkspace();
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [mode, setMode] = useState<TimelineMode>("week");
  const weekAnchor = today ? dateFromKey(today) : null;
  if (weekAnchor) weekAnchor.setDate(weekAnchor.getDate() + weekOffset * 7);
  const weekDates = weekAnchor ? getWeekDates(weekAnchor) : [];
  const monthAnchor = today ? dateFromKey(today) : null;
  if (monthAnchor) monthAnchor.setDate(1);
  const monthDates = getMonthDates(monthAnchor, monthOffset);
  const visibleMonthIndex = monthAnchor
    ? ((monthAnchor.getMonth() + monthOffset) % 12 + 12) % 12
    : -1;
  const visibleDates = mode === "month" ? monthDates : weekDates;
  const visibleKeys = new Set(visibleDates.map(getDateKey));
  const planNames = new Map(tasks.map((task) => [task.id, task.subject]));
  const subjects = Array.from(new Set(tasks.map((task) => task.subject))).sort();

  const visibleSessions = sessions.filter(
    (session) =>
      visibleKeys.has(session.scheduled_date) &&
      (selectedSubject === "all" ||
        planNames.get(session.plan_id) === selectedSubject),
  );
  const visiblePlans = tasks.filter(
    (task) =>
      visibleKeys.has(task.deadline) &&
      (selectedSubject === "all" || task.subject === selectedSubject),
  );
  const totalMinutes = visibleSessions.reduce((sum, session) => sum + session.duration_minutes, 0);
  const completedMinutes = visibleSessions
    .filter((session) => session.status === "completed")
    .reduce((sum, session) => sum + session.duration_minutes, 0);

  const weekRangeLabel = weekDates.length
    ? `${formatDate(getDateKey(weekDates[0]), { month: "long", day: "numeric" })} — ${formatDate(getDateKey(weekDates[6]), { month: "short", day: "numeric", year: "numeric" })}`
    : "";
  const rangeLabel =
    mode === "month" && monthDates.length
      ? formatDate(getDateKey(monthDates[Math.floor(monthDates.length / 2)]), { month: "long", year: "numeric" })
      : weekRangeLabel;

  function sessionsForDay(key: string) {
    return visibleSessions.filter((session) => session.scheduled_date === key);
  }

  const ganttPlans = tasks
    .filter((task) =>
      selectedSubject === "all" || task.subject === selectedSubject,
    )
    .filter((task) =>
      visibleKeys.has(task.deadline) ||
      sessions.some((session) => session.plan_id === task.id && visibleKeys.has(session.scheduled_date)),
    );
  const maxDailyMinutes = Math.max(
    1,
    ...visibleDates.map((date) =>
      visibleSessions
        .filter((session) => session.scheduled_date === getDateKey(date))
        .reduce((sum, session) => sum + session.duration_minutes, 0),
    ),
  );

  return (
    <div className="page-stack timeline-page">
      <h1 className="sr-only">Timeline &amp; Calendar</h1>
      <div className="timeline-toolbar">
        <div className="timeline-toolbar-row">
          <div className="view-switch" aria-label="Timeline view" role="group">
            {viewOptions.map((option) => (
              <button
                aria-pressed={mode === option.id}
                className={mode === option.id ? "selected" : ""}
                key={option.id}
                onClick={() => setMode(option.id)}
                type="button"
              >
                <MaterialIcon name={option.icon} size={15} />
                <span>{option.label}</span>
                {mode === option.id && <i aria-hidden="true" />}
              </button>
            ))}
          </div>
          <div className="week-controls">
            <button
              aria-label={`Previous ${mode === "month" ? "month" : "week"}`}
              className="icon-button"
              onClick={() => mode === "month" ? setMonthOffset((offset) => offset - 1) : setWeekOffset((offset) => offset - 1)}
              type="button"
            >
              <MaterialIcon name="chevron_left" size={16} />
            </button>
            <strong>{rangeLabel}</strong>
            <button
              aria-label={`Next ${mode === "month" ? "month" : "week"}`}
              className="icon-button"
              onClick={() => mode === "month" ? setMonthOffset((offset) => offset + 1) : setWeekOffset((offset) => offset + 1)}
              type="button"
            >
              <MaterialIcon name="chevron_right" size={16} />
            </button>
            <button
              className="button-compact"
              onClick={() => { setWeekOffset(0); setMonthOffset(0); }}
              type="button"
            >
              Today
            </button>
          </div>
        </div>
        <div className="timeline-summary">
          <div className="summary-chip">
            <span className="status-dot online" />
            <strong>{(totalMinutes / 60).toFixed(1)}h</strong> scheduled
          </div>
          <span className="telemetry-divider">/</span>
          <div className="summary-chip">
            <strong>{(completedMinutes / 60).toFixed(1)}h</strong> completed
            {totalMinutes > 0 && <span>({Math.round((completedMinutes / totalMinutes) * 100)}%)</span>}
          </div>
          <span className="telemetry-divider">/</span>
          <span className="summary-chip">{visibleSessions.length} sessions · {visiblePlans.length} deadlines</span>
        </div>
        <p className="timeline-data-note">Dates and durations reflect saved records; no start times are assumed.</p>
        <Link className="button-primary timeline-new-plan" href="/study-planner">
          <MaterialIcon name="add_circle" size={16} /> New study plan
        </Link>
      </div>

      <div className="timeline-filter-row">
        <span className="eyebrow">FILTER BY SUBJECT</span>
        <div className="subject-filters">
          <button
            aria-pressed={selectedSubject === "all"}
            className={selectedSubject === "all" ? "selected" : ""}
            onClick={() => setSelectedSubject("all")}
          >
            All subjects
          </button>
          {subjects.map((subject) => (
            <button
              aria-pressed={selectedSubject === subject}
              className={selectedSubject === subject ? "selected" : ""}
              key={subject}
              onClick={() => setSelectedSubject(subject)}
            >
              {subject}
            </button>
          ))}
        </div>
      </div>

      {!userId ? (
        <Panel><EmptyState title="Sign in to load your timeline" description="Your study sessions and deadlines are linked to your account." /></Panel>
      ) : sessionsLoading ? (
        <Panel><EmptyState title="Loading timeline" description="Your session and deadline records are being retrieved." /></Panel>
      ) : mode === "week" ? (
        <div className="week-timeline" aria-label={`Study schedule for ${rangeLabel}`}>
          {weekDates.map((date) => {
            const key = getDateKey(date);
            const daySessions = sessionsForDay(key);
            const dayPlans = visiblePlans.filter((task) => task.deadline === key);
            const isToday = key === today;
            return (
              <section className={`week-day${isToday ? " is-today" : ""}`} key={key}>
                <header className="week-day-header">
                  <div>
                    <MonoLabel>{new Intl.DateTimeFormat("en", { weekday: "short" }).format(date).toUpperCase()}</MonoLabel>
                    <strong>{new Intl.DateTimeFormat("en", { day: "numeric" }).format(date)}</strong>
                  </div>
                  {isToday && <span className="today-tag">TODAY</span>}
                  <span className="week-day-count">{daySessions.length} SESSIONS</span>
                </header>
                {dayPlans.map((plan) => (
                  <div className="day-deadline" key={`deadline-${plan.id}`}>
                    <span className="deadline-accent critical" />
                    <div><MonoLabel>DEADLINE</MonoLabel><strong>{plan.subject}</strong></div>
                  </div>
                ))}
                {daySessions.length ? (
                  <div className="day-session-list">
                    {daySessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        planName={planNames.get(session.plan_id)}
                        session={session}
                        onToggle={updateSessionStatus}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="day-empty">{dayPlans.length ? "No study sessions" : "No scheduled activity"}</p>
                )}
              </section>
            );
          })}
        </div>
      ) : mode === "month" ? (
        <div className="month-calendar" aria-label={`Monthly schedule for ${rangeLabel}`}>
          <div className="month-weekdays" aria-hidden="true">
            {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="month-days">
            {monthDates.map((date) => {
              const key = getDateKey(date);
              const daySessions = sessionsForDay(key);
              const dayPlans = visiblePlans.filter((plan) => plan.deadline === key);
              const outsideMonth = date.getMonth() !== visibleMonthIndex;
              const overflowCount =
                Math.max(0, dayPlans.length - 2) +
                Math.max(0, daySessions.length - 3);
              return (
                <section
                  aria-label={formatDate(key, { weekday: "long", month: "long", day: "numeric" })}
                  className={`month-day${outsideMonth ? " is-outside" : ""}${key === today ? " is-today" : ""}`}
                  key={key}
                >
                  <header>
                    <span>{date.getDate()}</span>
                    {key === today && <i aria-label="Today" />}
                  </header>
                  {dayPlans.slice(0, 2).map((plan) => (
                    <div className="month-deadline" key={plan.id} title={`Deadline: ${plan.subject}`}>
                      <MaterialIcon name="flag" size={12} />
                      <span>{plan.subject}</span>
                    </div>
                  ))}
                  {daySessions.slice(0, 3).map((session) => (
                    <button
                      aria-label={session.status === "completed" ? `Undo completion for ${session.title}` : `Mark ${session.title} complete`}
                      className={`month-session status-${session.status}`}
                      key={session.id}
                      onClick={() => void updateSessionStatus(session)}
                      title={`${session.title} · ${session.duration_minutes} minutes · ${session.status}`}
                      type="button"
                    >
                      <MaterialIcon name={session.status === "completed" ? "check_circle" : "radio_button_unchecked"} size={12} />
                      <span>{session.title}</span>
                    </button>
                  ))}
                  {overflowCount > 0 && (
                    <span className="month-overflow">+{overflowCount} more</span>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      ) : mode === "agenda" ? (
        <Panel className="agenda-panel" eyebrow="WEEKLY AGENDA" title={`${visibleSessions.length} study sessions`}>
          {visibleSessions.length ? (
            <div className="agenda-list">
              {visibleDates.map((date) => {
                const key = getDateKey(date);
                const daySessions = sessionsForDay(key);
                if (!daySessions.length) return null;
                return (
                  <div className="agenda-day" key={key}>
                    <div className="agenda-date">
                      <MonoLabel>{new Intl.DateTimeFormat("en", { weekday: "short" }).format(date).toUpperCase()}</MonoLabel>
                      <strong>{formatDate(key, { month: "short", day: "numeric" })}</strong>
                    </div>
                    <div className="agenda-entries">
                      {daySessions.map((session) => (
                        <SessionCard
                          key={session.id}
                          planName={planNames.get(session.plan_id)}
                          session={session}
                          onToggle={updateSessionStatus}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No sessions in this range" description="Try another week or create a study plan to schedule sessions." />
          )}
        </Panel>
      ) : (
        <section className="gantt-panel" aria-label={`Date-based study plan timeline for ${rangeLabel}`}>
          <div className="gantt-header">
            <strong>STUDY PLAN</strong>
            {weekDates.map((date) => (
              <div key={getDateKey(date)}>
                <MonoLabel>{new Intl.DateTimeFormat("en", { weekday: "short" }).format(date).toUpperCase()}</MonoLabel>
                <span>{date.getDate()}</span>
              </div>
            ))}
          </div>
          {ganttPlans.length ? ganttPlans.map((plan) => (
            <div className="gantt-row" key={plan.id}>
              <div className="gantt-plan">
                <strong>{plan.subject}</strong>
                <span>Due {formatDate(plan.deadline, { month: "short", day: "numeric" })}</span>
              </div>
              {weekDates.map((date) => {
                const key = getDateKey(date);
                const dayRecords = visibleSessions.filter(
                  (session) => session.plan_id === plan.id && session.scheduled_date === key,
                );
                const minutes = dayRecords.reduce((sum, session) => sum + session.duration_minutes, 0);
                return (
                  <div className="gantt-cell" key={key} title={minutes ? `${minutes} study minutes` : "No scheduled session"}>
                    {minutes > 0 && (
                      <span
                        className="gantt-bar"
                        style={{ width: `${Math.max(14, (minutes / maxDailyMinutes) * 100)}%` }}
                      />
                    )}
                    {minutes > 0 && <small>{minutes}m</small>}
                  </div>
                );
              })}
            </div>
          )) : (
            <EmptyState title="No study plans in this week" description="Plans appear here when their deadlines or saved sessions fall in the selected week." />
          )}
          <p className="timeline-data-note">Bars show saved minutes by date only; your session records do not include start times.</p>
        </section>
      )}

      <Panel className="timeline-deadline-footer" eyebrow="PLAN DEADLINES" title={mode === "month" ? "Deadlines this month" : "Deadlines in this week"}>
        {visiblePlans.length ? (
          <div className="deadline-list">
            {visiblePlans.map((plan) => (
              <div className="deadline-row" key={plan.id}>
                <span className="deadline-accent" />
                <div className="deadline-copy">
                  <span className="deadline-chip">{formatDate(plan.deadline, { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}</span>
                  <strong>{plan.subject}</strong>
                </div>
                <span className="deadline-date">{formatDate(plan.deadline, { month: "short", day: "numeric" })}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No plan deadlines in this range" description="Deadlines come from your saved study plans." />
        )}
      </Panel>
    </div>
  );
}

function SessionCard({
  session,
  planName,
  onToggle,
}: {
  session: StudySession;
  planName?: string;
  onToggle: (session: StudySession) => Promise<void>;
}) {
  return (
    <article className={`timeline-session status-${session.status}`}>
      <div className="timeline-session-main">
        <div className="timeline-session-topline">
          <span className={`status-pill ${session.status === "completed" ? "success" : session.status === "skipped" ? "warning" : ""}`}>
            {session.status}
          </span>
          <MonoLabel>{session.duration_minutes} MIN</MonoLabel>
        </div>
        <strong>{session.title}</strong>
        {planName && <span className="timeline-subject">{planName}</span>}
      </div>
      <button
        aria-label={session.status === "completed" ? `Undo completion for ${session.title}` : `Mark ${session.title} complete`}
        className={`session-toggle${session.status === "completed" ? " is-complete" : ""}`}
        onClick={() => void onToggle(session)}
        title={session.status === "completed" ? "Undo completion" : "Mark complete"}
      >
        <MaterialIcon name={session.status === "completed" ? "check_circle" : "radio_button_unchecked"} size={17} />
      </button>
    </article>
  );
}
