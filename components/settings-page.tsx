"use client";

import Link from "next/link";
import { EmptyState, MonoLabel, PageHeading, Panel } from "@/components/academic-ui";
import { MaterialIcon } from "@/components/material-icon";
import { useWorkspace } from "@/lib/workspace-context";

export function SettingsPage() {
  const {
    email,
    userId,
    authLoading,
    experience,
    experimentConnected,
    experimentLoading,
    signOut,
  } = useWorkspace();

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="YOUR ACCOUNT"
        title="Settings"
        description="Manage your account and review your Flagsmith planner assignment."
      />

      <div className="settings-grid">
        <Panel className="settings-panel" eyebrow="ACCOUNT" title="Your profile">
          {authLoading ? (
            <EmptyState title="Checking account" description="Waiting for your Supabase session." />
          ) : (
            <>
              <div className="settings-identity">
                <span className="settings-identity-icon"><MaterialIcon name="account_circle" size={20} /></span>
                <div>
                  <MonoLabel>EMAIL ADDRESS</MonoLabel>
                  <strong className="break-all">{email || "No email available"}</strong>
                </div>
              </div>
              <div className="settings-detail-row">
                <span>Session status</span>
                <span className={`status-pill ${userId ? "success" : ""}`}>{userId ? "SIGNED IN" : "SIGNED OUT"}</span>
              </div>
              {userId ? (
                <button className="button-danger" onClick={() => void signOut()}>
                  <MaterialIcon name="logout" size={15} /> Sign out
                </button>
              ) : (
                <Link className="button-primary" href="/login">Sign in <MaterialIcon name="arrow_outward" size={14} /></Link>
              )}
            </>
          )}
        </Panel>

        <Panel className="settings-panel" eyebrow="FLAGSMITH EXPERIMENT" title="Your planner assignment">
          <div className="settings-identity">
            <span className="settings-identity-icon violet"><MaterialIcon name="flag" size={19} /></span>
            <div>
              <MonoLabel>CURRENT EXPERIENCE</MonoLabel>
              <strong className="settings-code">
                {experimentLoading ? "Checking Flagsmith" : experimentConnected ? experience : "Unavailable"}
              </strong>
            </div>
          </div>
          <div className="settings-detail-row">
            <span>Available planner style</span>
            <strong className={experimentConnected ? "variation-live" : "variation-unavailable"}>
              {experimentLoading
                ? "Assignment in progress"
                : experimentConnected
                  ? experience
                  : "Not enrolled / unavailable"}
            </strong>
          </div>
          <div className="settings-detail-row">
            <span>Experiment participation</span>
            <span className={`status-pill ${experimentConnected ? "success" : ""}`}>
              {experimentLoading ? "ASSIGNING" : experimentConnected ? "ENROLLED" : "NOT ENROLLED"}
            </span>
          </div>
          <div className="settings-detail-row">
            <span>Feature flag</span>
            <code>study_planner_experience_v2</code>
          </div>
          <div className="settings-detail-row">
            <span>Success event</span>
            <code>study_plan_created</code>
          </div>
          <p className="settings-help">
            Flagsmith assigns one planner version per enrolled participant. A successful plan save records the event for enrolled accounts. You can’t change your assigned version here.
          </p>
        </Panel>

        <Panel className="settings-panel settings-wide" eyebrow="DATA & PRIVACY" title="Your workspace data">
          <div className="settings-identity">
            <span className="settings-identity-icon"><MaterialIcon name="verified_user" size={19} /></span>
            <div>
              <strong>Your study records</strong>
              <p>Your study plans and sessions are saved to your account. The assistant can use those records to tailor its replies.</p>
            </div>
          </div>
          <div className="settings-data-links">
            <Link href="/study-planner">Study Planner <MaterialIcon name="arrow_outward" size={14} /></Link>
            <Link href="/timeline">Timeline & Calendar <MaterialIcon name="arrow_outward" size={14} /></Link>
            <Link href="/performance">Performance Intelligence <MaterialIcon name="arrow_outward" size={14} /></Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
