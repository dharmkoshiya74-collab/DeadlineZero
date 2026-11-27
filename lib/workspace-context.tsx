"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import flagsmith from "@flagsmith/flagsmith";
import { supabase } from "@/lib/supabase";
import {
  calculateProgress,
  generateStudySchedule,
  getTodayKey,
  type StudyPlan,
  type StudySession,
} from "@/lib/study-utils";

type PlanInput = {
  subject: string;
  deadline: string;
  estimatedMinutes: string;
  difficulty: string;
  priority: string;
  availableMinutes: string;
};

type SessionInput = {
  planId: string;
  scheduledDate: string;
  durationMinutes: number;
};

type WorkspaceContextValue = {
  tasks: StudyPlan[];
  sessions: StudySession[];
  userId: string | null;
  email: string;
  authLoading: boolean;
  sessionsLoading: boolean;
  saving: boolean;
  message: string;
  experience: string;
  experimentConnected: boolean;
  today: string | null;
  isSmart: boolean;
  setMessage: (message: string) => void;
  createPlan: (input: PlanInput) => Promise<boolean>;
  createSession: (input: SessionInput) => Promise<boolean>;
  updateSessionStatus: (session: StudySession) => Promise<void>;
  removePlan: (id: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<StudyPlan[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [experience, setExperience] = useState("traditional_planner");
  const [experimentConnected, setExperimentConnected] = useState(false);
  const [today, setToday] = useState<string | null>(null);
  const isSmart = experience === "smart_planner";

  useEffect(() => {
    let cancelled = false;
    let identityRevision = 0;
    let authEventVersion = 0;
    let unsubscribe: (() => void) | null = null;

    async function syncExperimentIdentity(session: Session | null) {
      const revision = ++identityRevision;

      if (!session?.user) {
        setExperience("traditional_planner");
        setExperimentConnected(false);
        return;
      }

      try {
        await flagsmith.identify(session.user.id);

        if (cancelled || revision !== identityRevision) return;

        const experiment = flagsmith.getExperimentFlag(
          "study_planner_experience_v2",
        );
        const assignedExperience = String(experiment?.value ?? "");
        const isEnrolled = experiment?.experiment?.inExperiment === true;

        if (
          !isEnrolled ||
          (assignedExperience !== "smart_planner" &&
            assignedExperience !== "traditional_planner")
        ) {
          setExperience("traditional_planner");
          setExperimentConnected(false);
          console.log(
            "[Flagsmith] User is not enrolled in the experiment:",
            experiment,
          );
          return;
        }

        setExperience(assignedExperience);
        setExperimentConnected(true);
        console.log(
          "[Flagsmith] Authenticated experiment participant:",
          session.user.id,
          "Variation:",
          assignedExperience,
        );
      } catch (error) {
        console.error("[Flagsmith] Identity synchronization failed:", error);

        if (!cancelled && revision === identityRevision) {
          setExperimentConnected(false);
        }
      }
    }

    async function setupExperiment() {
      const environmentID = process.env.NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID;

      if (!environmentID) {
        console.error("Flagsmith environment ID is missing.");
        return;
      }

      try {
        await flagsmith.init({
          environmentID,
          cacheFlags: true,
          enableEvents: true,
        });

        if (cancelled) return;

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          authEventVersion++;
          void syncExperimentIdentity(session);
        });

        unsubscribe = () => subscription.unsubscribe();

        const versionBeforeSessionCheck = authEventVersion;
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;
        if (cancelled) return;

        if (versionBeforeSessionCheck === authEventVersion) {
          await syncExperimentIdentity(data.session);
        }
      } catch (error) {
        console.error("[Flagsmith] Experiment initialization failed:", error);

        if (!cancelled) {
          setExperimentConnected(false);
        }
      }
    }

    void setupExperiment();

    return () => {
      cancelled = true;
      identityRevision++;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    let active = true;
    let authEventVersion = 0;
    let revision = 0;

    async function syncSession(session: Session | null) {
      const currentRevision = ++revision;

      if (!session?.user) {
        setUserId(null);
        setEmail("");
        setTasks([]);
        setSessions([]);
        setAuthLoading(false);
        setSessionsLoading(false);
        return;
      }

      setAuthLoading(true);
      setSessionsLoading(true);
      setUserId(session.user.id);
      setEmail(session.user.email ?? "");

      try {
        const [plansResult, sessionsResult] = await Promise.all([
          supabase
            .from("study_plans")
            .select("id, subject, deadline, completed")
            .eq("user_id", session.user.id)
            .order("deadline", { ascending: true }),
          supabase
            .from("study_sessions")
            .select(
              "id, user_id, plan_id, title, scheduled_date, duration_minutes, status",
            )
            .eq("user_id", session.user.id)
            .order("scheduled_date", { ascending: true }),
        ]);

        if (plansResult.error) throw plansResult.error;
        if (sessionsResult.error) throw sessionsResult.error;
        if (!active || currentRevision !== revision) return;

        setTasks((plansResult.data ?? []) as StudyPlan[]);
        setSessions((sessionsResult.data ?? []) as StudySession[]);
      } catch (error) {
        console.error("[Supabase] Failed to load user data:", error);

        if (active && currentRevision === revision) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not load your study data.",
          );
        }
      } finally {
        if (active && currentRevision === revision) {
          setAuthLoading(false);
          setSessionsLoading(false);
        }
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventVersion++;
      void syncSession(session);
    });

    const versionBeforeSessionCheck = authEventVersion;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;

      if (error) {
        console.error("[Supabase] Session check failed:", error);
        setAuthLoading(false);
        return;
      }

      if (versionBeforeSessionCheck === authEventVersion) {
        void syncSession(data.session);
      }
    });

    return () => {
      active = false;
      revision++;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setToday(
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date()),
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function createPlan(input: PlanInput): Promise<boolean> {
    const subject = input.subject.trim();
    if (!subject || !input.deadline) {
      setMessage("Enter a subject and deadline first.");
      return false;
    }

    const studyMinutes = Number(input.estimatedMinutes);
    const dailyMinutes = Number(input.availableMinutes);

    if (
      !Number.isInteger(studyMinutes) ||
      studyMinutes < 15 ||
      studyMinutes > 10000
    ) {
      setMessage("Study duration must be between 15 and 10000 minutes.");
      return false;
    }

    if (
      isSmart &&
      (!Number.isInteger(dailyMinutes) ||
        dailyMinutes < 15 ||
        dailyMinutes > 600)
    ) {
      setMessage("Daily availability must be between 15 and 600 minutes.");
      return false;
    }

    const currentDate = new Date();
    const todayString = [
      currentDate.getFullYear(),
      String(currentDate.getMonth() + 1).padStart(2, "0"),
      String(currentDate.getDate()).padStart(2, "0"),
    ].join("-");

    if (input.deadline <= todayString) {
      setMessage("Please select a future deadline.");
      return false;
    }

    if (!userId) {
      router.push("/login");
      return false;
    }

    setSaving(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("study_plans")
        .insert({
          user_id: userId,
          subject,
          deadline: input.deadline,
          estimated_minutes: studyMinutes,
          difficulty: isSmart ? input.difficulty : "medium",
          priority: isSmart ? input.priority : "medium",
          available_minutes_per_day: isSmart ? dailyMinutes : 60,
        })
        .select("id, subject, deadline")
        .single();

      if (error) throw error;

      const generatedSessions = isSmart
        ? generateStudySchedule(studyMinutes, dailyMinutes, input.deadline).map(
            (slot) => ({
              user_id: userId,
              plan_id: data.id,
              title: `${data.subject} - Study session`,
              scheduled_date: slot.scheduled_date,
              duration_minutes: slot.duration_minutes,
              status: "pending",
            }),
          )
        : [];
      let saveMessage = "Your study plan has been saved.";

      if (generatedSessions.length > 0) {
        const { error: sessionError } = await supabase
          .from("study_sessions")
          .insert(generatedSessions);

        if (sessionError) {
          console.error("Session creation error:", sessionError);
          saveMessage =
            "Plan saved, but study sessions could not be generated: " +
            sessionError.message;
        } else {
          const { data: savedSessions, error: reloadError } = await supabase
            .from("study_sessions")
            .select(
              "id, user_id, plan_id, title, scheduled_date, duration_minutes, status",
            )
            .eq("user_id", userId)
            .order("scheduled_date", { ascending: true });

          if (reloadError) {
            console.error("[Supabase] Failed to reload study sessions:", reloadError);
            saveMessage =
              "Plan saved, but the updated session list could not be loaded.";
          } else {
            setSessions((savedSessions ?? []) as StudySession[]);
          }
        }
      }

      setTasks((current) => [...current, data]);

      if (experimentConnected) {
        try {
          flagsmith.trackEvent("study_plan_created", {
            metadata: {
              source: "deadlinezero_planner",
              planner: isSmart ? "smart" : "traditional",
            },
          });
          await flagsmith.flushEvents();
        } catch (trackingError) {
          console.error("Experiment event error:", trackingError);
        }
      }

      setMessage(saveMessage);
      return true;
    } catch (error) {
      console.error("[Supabase] Could not save study plan:", error);
      setMessage(
        error instanceof Error ? error.message : "Could not save your plan.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function updateSessionStatus(session: StudySession) {
    const nextStatus =
      session.status === "completed" ? "pending" : "completed";
    const { error } = await supabase
      .from("study_sessions")
      .update({ status: nextStatus })
      .eq("id", session.id)
      .eq("user_id", userId);

    if (error) {
      console.error("Session update error:", error);
      setMessage("Could not update this study session: " + error.message);
      return;
    }

    setSessions((current) =>
      current.map((item) =>
        item.id === session.id ? { ...item, status: nextStatus } : item,
      ),
    );

    if (nextStatus === "completed") {
      try {
        flagsmith.trackEvent("study_session_completed", {
          metadata: {
            source: "deadlinezero_calendar",
            session_id: session.id,
          },
        });
        await flagsmith.flushEvents();
      } catch (trackingError) {
        console.error("Session completion event error:", trackingError);
      }
    }

    setMessage(
      nextStatus === "completed"
        ? "Study session completed. Great work!"
        : "Session moved back to pending.",
    );
  }

  async function createSession(input: SessionInput): Promise<boolean> {
    const plan = tasks.find((task) => task.id === input.planId);
    if (!plan) {
      setMessage("Choose a saved study plan for this session.");
      return false;
    }

    if (!userId) {
      router.push("/login");
      return false;
    }

    const duration = input.durationMinutes;
    const sessionDate = input.scheduledDate;
    const minimumDate = today ?? getTodayKey();

    if (!sessionDate || sessionDate < minimumDate) {
      setMessage("Choose today or a future date for this session.");
      return false;
    }

    if (!Number.isInteger(duration) || duration < 15 || duration > 600) {
      setMessage("Session duration must be between 15 and 600 minutes.");
      return false;
    }

    setSaving(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("study_sessions")
        .insert({
          user_id: userId,
          plan_id: plan.id,
          title: `${plan.subject} - Study session`,
          scheduled_date: sessionDate,
          duration_minutes: duration,
          status: "pending",
        })
        .select(
          "id, user_id, plan_id, title, scheduled_date, duration_minutes, status",
        )
        .single();

      if (error) throw error;

      setSessions((current) =>
        [...current, data as StudySession].sort((left, right) =>
          left.scheduled_date.localeCompare(right.scheduled_date),
        ),
      );
      setMessage("Study session added to your calendar.");
      return true;
    } catch (error) {
      console.error("[Supabase] Could not create study session:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not add this study session.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function removePlan(id: string) {
    const { error } = await supabase
      .from("study_plans")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Supabase] Could not delete study plan:", error);
      setMessage("Could not delete this plan: " + error.message);
      return;
    }

    setTasks((current) => current.filter((task) => task.id !== id));
    setSessions((current) => current.filter((session) => session.plan_id !== id));
    setMessage("Study plan removed.");
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[Supabase] Sign-out failed:", error);
      setMessage("Unable to sign out: " + error.message);
      return;
    }

    router.push("/login");
    router.refresh();
  }

  const value: WorkspaceContextValue = {
    tasks,
    sessions,
    userId,
    email,
    authLoading,
    sessionsLoading,
    saving,
    message,
    experience,
    experimentConnected,
    today,
    isSmart,
    setMessage,
    createPlan,
    createSession,
    updateSessionStatus,
    removePlan,
    signOut,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider.");
  }
  return context;
}

export { calculateProgress };
