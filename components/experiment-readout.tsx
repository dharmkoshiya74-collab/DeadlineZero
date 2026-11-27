"use client";

import Link from "next/link";
import { MonoLabel, Panel } from "@/components/academic-ui";
import { MaterialIcon } from "@/components/material-icon";
import { useWorkspace } from "@/lib/workspace-context";

export function ExperimentReadout() {
  const { experimentConnected, experimentLoading, isSmart } = useWorkspace();
  const assignment = experimentLoading
    ? "Assigning with Flagsmith"
    : experimentConnected
      ? isSmart
        ? "Treatment · Smart planner"
        : "Control · Traditional planner"
      : "No active assignment";

  return (
    <Panel
      className="experiment-readout"
      eyebrow="TRACK 01 · FLAGSMITH EXPERIMENTATION"
      title="Does automatic scheduling help students save a study plan?"
      action={
        <span className={`status-pill${experimentConnected ? " success" : ""}`}>
          {experimentConnected ? "PARTICIPATING" : experimentLoading ? "ASSIGNING" : "NOT ENROLLED"}
        </span>
      }
    >
      <div className="experiment-assignment-row">
        <div>
          <MonoLabel>YOUR ASSIGNMENT</MonoLabel>
          <strong>{assignment}</strong>
        </div>
        <Link className="text-link" href="/study-planner">
          Open study planner <MaterialIcon name="arrow_forward" size={15} />
        </Link>
      </div>

      <div className="experiment-brief-grid">
        <div className="experiment-key">
          <MonoLabel>FEATURE FLAG</MonoLabel>
          <code>study_planner_experience_v2</code>
          <strong>Flagsmith assigns a stable variation to enrolled accounts.</strong>
        </div>
        <div className="experiment-key">
          <MonoLabel>CONTROL · TRADITIONAL_PLANNER</MonoLabel>
          <strong>Save the task, then organize study sessions yourself.</strong>
        </div>
        <div className="experiment-key">
          <MonoLabel>TREATMENT · SMART_PLANNER</MonoLabel>
          <strong>Generate study sessions around the deadline and daily availability.</strong>
        </div>
        <div className="experiment-key">
          <MonoLabel>PRIMARY SUCCESS EVENT</MonoLabel>
          <code>study_plan_created</code>
          <strong>Recorded only after a plan is saved to the student account.</strong>
        </div>
      </div>

      <p className="panel-copy experiment-readout-note">
        Flagsmith Experimentation calculates the variation comparison and win probability from enrolled participants. The progress figures elsewhere in this app describe one student’s activity, not the A/B test result.
      </p>
    </Panel>
  );
}
