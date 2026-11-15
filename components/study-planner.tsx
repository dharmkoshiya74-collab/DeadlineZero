"use client";

import { useMemo, useState, type FormEvent } from "react";
import { EmptyState, MonoLabel, Panel } from "@/components/academic-ui";
import { MaterialIcon } from "@/components/material-icon";
import { useWorkspace } from "@/lib/workspace-context";
import { formatDate, generateStudySchedule } from "@/lib/study-utils";

export function StudyPlanner() {
  const {
    tasks,
    sessions,
    userId,
    authLoading,
    saving,
    isSmart,
    experience,
    experimentConnected,
    today,
    createPlan,
    removePlan,
  } = useWorkspace();
  const [subject, setSubject] = useState("");
  const [deadline, setDeadline] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("300");
  const [difficulty, setDifficulty] = useState("medium");
  const [priority, setPriority] = useState("medium");
  const [availableMinutes, setAvailableMinutes] = useState("60");

  const studyMinutes = Number(estimatedMinutes);
  const dailyMinutes = Number(availableMinutes);
  const preview = useMemo(() => {
    if (
      !isSmart ||
      !deadline ||
      deadline <= (today ?? "") ||
      !Number.isInteger(studyMinutes) ||
      studyMinutes < 15 ||
      !Number.isInteger(dailyMinutes) ||
      dailyMinutes < 15
    ) {
      return [];
    }

    return generateStudySchedule(studyMinutes, dailyMinutes, deadline);
  }, [isSmart, deadline, today, studyMinutes, dailyMinutes]);

  const totalPreviewMinutes = preview.reduce((sum, slot) => sum + slot.duration_minutes, 0);
  const previewByDate = preview.reduce<Record<string, number>>((days, slot) => {
    days[slot.scheduled_date] = (days[slot.scheduled_date] ?? 0) + slot.duration_minutes;
    return days;
  }, {});

  async function submitPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await createPlan({
      subject,
      deadline,
      estimatedMinutes,
      difficulty,
      priority,
      availableMinutes,
    });
    if (saved) {
      setSubject("");
      setDeadline("");
    }
  }

  const assignments = tasks.map((task) => ({
    ...task,
    sessions: sessions.filter((session) => session.plan_id === task.id),
  }));

  return (
    <div className="page-stack">
      <div className="planner-experiment-strip">
        <div className="experiment-strip-main">
          <span className={`status-dot${experimentConnected ? " online" : ""}`} />
          <MonoLabel>FLAGSMITH EXPERIMENT</MonoLabel>
          <span className="telemetry-divider">/</span>
          <code>study_planner_experience_v2</code>
          <span className="telemetry-divider">/</span>
          <span>VARIATION:</span>
          <strong className={experimentConnected ? "variation-live" : "variation-unavailable"}>
            {experimentConnected ? experience : "not enrolled"}
          </strong>
        </div>
        <div aria-label="Assigned planner variation" className="planner-variant-tabs">
          <span className={experimentConnected && isSmart ? "selected" : ""}>
            Treatment (Smart)
          </span>
          <span className={experimentConnected && !isSmart ? "selected" : ""}>
            Control (Manual)
          </span>
        </div>
      </div>

      <div className="planner-intro">
        <div className="planner-intro-icon"><MaterialIcon name="auto_awesome" size={21} /></div>
        <div>
          <div className="planner-intro-title">
            <h1>{isSmart ? "Smart Study Plan Generator" : "Traditional Study Planner"}</h1>
            <span className={`variant-label ${isSmart ? "smart" : ""}`}>{isSmart ? "SMART VARIATION" : "TRADITIONAL VARIATION"}</span>
          </div>
          <p>
            {isSmart
              ? "Your assigned variation divides available study time into up-to-60-minute sessions across the days before your deadline."
              : "Your assigned variation saves a study plan without automatically creating scheduled sessions."}
          </p>
        </div>
        <div className="planner-state">
          <MonoLabel>ASSIGNMENT</MonoLabel>
          <strong>{experimentConnected ? (isSmart ? "ENROLLED · SMART" : "ENROLLED · TRADITIONAL") : "UNAVAILABLE"}</strong>
        </div>
      </div>

      <div className="planner-grid">
        <Panel
          className="planner-form-panel"
          eyebrow="PLAN CONFIGURATION"
          title={isSmart ? "Build a study plan" : "Add a study task"}
          action={<MonoLabel>REQUIRED FIELDS</MonoLabel>}
        >
          <form className="planner-form" onSubmit={(event) => void submitPlan(event)}>
            <div className="field-group field-span">
              <label htmlFor="planner-subject">Subject or task name</label>
              <input
                autoComplete="off"
                id="planner-subject"
                maxLength={120}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="What are you studying?"
                required
                value={subject}
              />
            </div>

            <div className="field-group">
              <label htmlFor="planner-deadline">Deadline</label>
              <input
                id="planner-deadline"
                onChange={(event) => setDeadline(event.target.value)}
                required
                type="date"
                value={deadline}
              />
            </div>
            <div className="field-group">
              <label htmlFor="planner-duration">Estimated study time</label>
              <div className="input-with-suffix">
                <input
                  id="planner-duration"
                  max="10000"
                  min="15"
                  onChange={(event) => setEstimatedMinutes(event.target.value)}
                  required
                  step="15"
                  type="number"
                  value={estimatedMinutes}
                />
                <span>MIN</span>
              </div>
            </div>

            {isSmart ? (
              <>
                <div className="field-group">
                  <label htmlFor="planner-availability">Available time per day</label>
                  <div className="input-with-suffix">
                    <input
                      id="planner-availability"
                      max="600"
                      min="15"
                      onChange={(event) => setAvailableMinutes(event.target.value)}
                      required
                      step="15"
                      type="number"
                      value={availableMinutes}
                    />
                    <span>MIN / DAY</span>
                  </div>
                </div>
                <div className="field-group">
                  <label htmlFor="planner-difficulty">Difficulty</label>
                  <select id="planner-difficulty" onChange={(event) => setDifficulty(event.target.value)} value={difficulty}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="planner-priority">Priority</label>
                  <select id="planner-priority" onChange={(event) => setPriority(event.target.value)} value={priority}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="traditional-note field-span">
                <MaterialIcon name="check_circle" size={17} />
                <p>Traditional planning stores the subject, deadline, and estimated duration. It does not generate sessions automatically.</p>
              </div>
            )}

            <button
              className="button-primary form-submit"
              disabled={saving || authLoading}
              type="submit"
            >
              <MaterialIcon name="add" size={16} />
              {saving ? "Saving plan…" : "Save study plan"}
            </button>
            {!userId && !authLoading && (
              <p className="form-helper field-span">You’ll be asked to sign in before a plan can be saved.</p>
            )}
          </form>
        </Panel>

        <div className="planner-preview-column">
          <Panel
            className="preview-panel"
            eyebrow="SCHEDULE PREVIEW"
            title={isSmart ? "Generated session preview" : "Traditional plan"}
            action={isSmart ? <MonoLabel>{preview.length} SESSIONS</MonoLabel> : <MonoLabel>NO AUTO SCHEDULING</MonoLabel>}
          >
            {isSmart ? (
              deadline && today && deadline <= today ? (
                <EmptyState title="Choose a future deadline" description="The planner creates sessions on days after today and up to the selected deadline." />
              ) : preview.length ? (
                <>
                  <div className="preview-summary">
                    <div><MonoLabel>ALLOCATED</MonoLabel><strong>{(totalPreviewMinutes / 60).toFixed(1)}h</strong></div>
                    <div><MonoLabel>ESTIMATED</MonoLabel><strong>{studyMinutes}m</strong></div>
                    <div><MonoLabel>DAILY LIMIT</MonoLabel><strong>{dailyMinutes}m</strong></div>
                  </div>
                  <div className="preview-list">
                    {Object.entries(previewByDate).map(([date, minutes]) => (
                      <div className="preview-day" key={date}>
                        <div className="preview-day-date">
                          <MaterialIcon name="calendar_month" size={15} />
                          <strong>{formatDate(date, { weekday: "short", month: "short", day: "numeric" })}</strong>
                        </div>
                        <span>{minutes} MIN</span>
                        <div className="preview-day-bar"><span style={{ width: `${Math.min(100, (minutes / dailyMinutes) * 100)}%` }} /></div>
                      </div>
                    ))}
                  </div>
                  {totalPreviewMinutes < studyMinutes && (
                    <p className="schedule-warning">
                      The available days can fit {totalPreviewMinutes} of {studyMinutes} minutes. The current scheduler stops at the deadline.
                    </p>
                  )}
                </>
              ) : (
                <EmptyState
                  title={studyMinutes > 0 && studyMinutes < 15 ? "Study duration is too short" : deadline ? "Add a future deadline and valid duration" : "Preview appears as you plan"}
                  description="The preview follows the same daily availability and session-length rules used when you save a Smart plan."
                />
              )
            ) : (
              <div className="traditional-preview">
                <div className="traditional-preview-icon"><MaterialIcon name="event_available" size={20} /></div>
                <p>Traditional variation saves your task details only. No sessions are generated, matching the current planner behavior.</p>
              </div>
            )}
          </Panel>

          <Panel className="saved-plans-panel" eyebrow="YOUR WORKSPACE" title="Saved study plans">
            {authLoading ? (
              <EmptyState title="Loading plans" description="Your saved plans are being retrieved." />
            ) : !userId ? (
              <EmptyState title="Sign in to view plans" description="Saved plans are associated with your account." />
            ) : assignments.length ? (
              <div className="saved-plan-list">
                {assignments.slice(0, 5).map((task) => (
                  <div className="saved-plan-row" key={task.id}>
                    <span className="saved-plan-icon"><MaterialIcon name="check_circle" size={16} /></span>
                    <div className="saved-plan-copy">
                      <strong>{task.subject}</strong>
                      <span><MaterialIcon name="schedule" size={12} /> {formatDate(task.deadline, { month: "short", day: "numeric", year: "numeric" })} · {task.sessions.length} sessions</span>
                    </div>
                    <button
                      aria-label={`Delete ${task.subject} study plan`}
                      className="icon-button"
                      onClick={() => void removePlan(task.id)}
                      title="Delete plan"
                      type="button"
                    >
                      <MaterialIcon name="delete" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No saved plans" description="Your plans will appear here after you create one." />
            )}
          </Panel>
        </div>
      </div>

      <div className="planner-footnote">
        <MaterialIcon name="bolt" size={15} />
        <span>Experience assignment is read from Flagsmith; creating a plan records the existing <code>study_plan_created</code> conversion event when the account is enrolled.</span>
      </div>
    </div>
  );
}
