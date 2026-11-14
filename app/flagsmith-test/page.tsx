"use client";

import { useEffect, useState } from "react";
import flagsmith from "@flagsmith/flagsmith";

export default function FlagsmithTestPage() {
  const [status, setStatus] = useState("Connecting...");
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const environmentID = process.env.NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID;

  useEffect(() => {
    let mounted = true;

    if (!environmentID) return;

    flagsmith
      .init({
        environmentID,
        cacheFlags: true,
        onChange: () => {
          if (mounted) {
            setEnabled(flagsmith.hasFeature("show_demo_button"));
            setStatus("Connected to Flagsmith successfully!");
          }
        },
      })
      .catch((error) => {
        console.error("Flagsmith connection error:", error);
        if (mounted) {
          setStatus("Connection failed. Check your environment key.");
        }
      });

    return () => {
      mounted = false;
    };
  }, [environmentID]);

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        <p className="text-sm font-semibold tracking-widest text-cyan-400">
          TEAM VORTEX
        </p>

        <h1 className="mt-3 text-3xl font-bold">
          DeadlineZero
        </h1>

        <p className="mt-2 text-slate-400">
          Flagsmith Integration Test
        </p>

        <div className="mt-8 rounded-xl bg-slate-800 p-5">
          <p className="text-sm text-slate-400">
            Connection status
          </p>
          <p className="mt-2 text-lg font-semibold">
            {!environmentID ? "Environment key is missing." : status}
          </p>
        </div>

        <div className="mt-5 rounded-xl bg-slate-800 p-5">
          <p className="text-sm text-slate-400">
            Feature flag: show_demo_button
          </p>

          <p className="mt-2 text-xl font-bold">
            {enabled === null
              ? "Waiting for flags..."
              : enabled
                ? "ENABLED"
                : "DISABLED"}
          </p>
        </div>

        {enabled && (
          <button className="mt-6 rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-slate-950">
            Demo feature is working!
          </button>
        )}
      </div>
    </main>
  );
}

