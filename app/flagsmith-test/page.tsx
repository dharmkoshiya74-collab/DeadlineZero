"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import flagsmith from "@flagsmith/flagsmith";
import { EmptyState, MonoLabel, PageHeading, Panel } from "@/components/academic-ui";
import { MaterialIcon } from "@/components/material-icon";
import { supabase } from "@/lib/supabase";

const EXPERIMENT_FLAG = "study_planner_experience_v2";

type DiagnosticState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "not_enrolled" }
  | { status: "ready"; variation: "smart_planner" | "traditional_planner" }
  | { status: "error"; message: string };

export default function FlagsmithTestPage() {
  const [diagnostic, setDiagnostic] = useState<DiagnosticState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    async function checkExperiment() {
      const environmentID = process.env.NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID;
      if (!environmentID) {
        setDiagnostic({
          status: "error",
          message: "The Flagsmith environment ID is not configured for this deployment.",
        });
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!data.session?.user) {
          if (active) setDiagnostic({ status: "signed_out" });
          return;
        }

        await flagsmith.init({ environmentID, cacheFlags: true });
        await flagsmith.identify(data.session.user.id);
        if (!active) return;

        const experiment = flagsmith.getAllFlags()[EXPERIMENT_FLAG];
        if (experiment?.experiment?.inExperiment !== true) {
          setDiagnostic({ status: "not_enrolled" });
          return;
        }

        const variation = String(
          flagsmith.getValue(EXPERIMENT_FLAG, { skipAnalytics: true }) ?? "",
        );
        if (variation !== "smart_planner" && variation !== "traditional_planner") {
          setDiagnostic({
            status: "error",
            message: "Flagsmith returned an unexpected variation. Check the experiment variation values.",
          });
          return;
        }

        setDiagnostic({ status: "ready", variation });
      } catch (error) {
        console.error("[Flagsmith] Experiment diagnostic failed:", error);
        if (active) {
          setDiagnostic({
            status: "error",
            message: "Could not read the experiment assignment. Check the Flagsmith environment and experiment configuration.",
          });
        }
      }
    }

    void checkExperiment();
    return () => {
      active = false;
    };
  }, []);

  const isReady = diagnostic.status === "ready";
  const statusLabel = isReady
    ? "ENROLLED"
    : diagnostic.status === "loading"
      ? "CHECKING"
      : diagnostic.status === "not_enrolled"
        ? "NOT ENROLLED"
        : diagnostic.status === "error"
          ? "NEEDS ATTENTION"
          : "SIGN IN REQUIRED";

  return (
    <main className="min-h-screen bg-[#f5f6fa] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link className="text-link" href="/">
          <MaterialIcon name="arrow_back" size={15} /> Back to DeadlineZero
        </Link>

        <PageHeading
          eyebrow="FLAGSMITH INTEGRATION"
          title="Study planner experiment"
          description="Check the assigned variation and metric used by the Track 01 A/B test."
        />

        <Panel
          eyebrow="ASSIGNMENT STATUS"
          title="Your experiment connection"
          action={<span className={`status-pill${isReady ? " success" : ""}`}>{statusLabel}</span>}
        >
          {diagnostic.status === "loading" ? (
            <div className="experiment-status" role="status">
              <span className="status-dot online" />
              <span>Checking your signed-in Flagsmith assignment…</span>
            </div>
          ) : diagnostic.status === "signed_out" ? (
            <EmptyState
              title="Sign in to check your assignment"
              description="Flagsmith assigns the planner experiment to signed-in participants."
              action={<Link className="button-primary" href="/login">Sign in <MaterialIcon name="arrow_forward" size={15} /></Link>}
            />
          ) : diagnostic.status === "error" ? (
            <p className="panel-copy" role="alert">{diagnostic.message}</p>
          ) : diagnostic.status === "not_enrolled" ? (
            <EmptyState
              title="This account is not enrolled"
              description="The study planner remains available as a manual fallback. This account will not send the experiment success event."
              action={<Link className="button-primary" href="/study-planner">Open study planner <MaterialIcon name="arrow_forward" size={15} /></Link>}
            />
          ) : (
            <>
              <div className="experiment-key">
                <MonoLabel>ASSIGNED VARIATION</MonoLabel>
                <strong className="variation-live">
                  {diagnostic.variation === "smart_planner"
                    ? "Treatment · Smart planner"
                    : "Control · Traditional planner"}
                </strong>
              </div>
              <p className="panel-copy">
                This diagnostic reads your assignment without recording a flag exposure or success event. Open the study planner to enter the assigned experience.
              </p>
              <div className="panel-footer-link">
                <span>Continue to your assigned planner</span>
                <Link href="/study-planner">Open planner <MaterialIcon name="arrow_forward" size={15} /></Link>
              </div>
            </>
          )}
        </Panel>

        <Panel eyebrow="EXPERIMENT MEASUREMENT" title="What counts as success?">
          <div className="experiment-key">
            <MonoLabel>FEATURE FLAG</MonoLabel>
            <code>{EXPERIMENT_FLAG}</code>
          </div>
          <div className="experiment-key">
            <MonoLabel>PRIMARY EVENT</MonoLabel>
            <code>study_plan_created</code>
            <strong>Recorded for enrolled participants after a study plan saves successfully.</strong>
          </div>
          <p className="panel-copy">
            Flagsmith Experimentation reports conversion and win probability across enrolled participants. This page only checks your assignment and event definition.
          </p>
        </Panel>
      </div>
    </main>
  );
}
