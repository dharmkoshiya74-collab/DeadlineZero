"use client";
import type { Session } from "@supabase/supabase-js";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import flagsmith from "@flagsmith/flagsmith";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard, CalendarDays, BookOpen, ChartNoAxesCombined,
  Bot, Settings, Bell, Search, Plus, ArrowUpRight, Clock3,
  CheckCircle2, Circle, Trash2, LogOut, Menu, X,
  Sparkles, Target, Flame, GraduationCap,
  Send, Loader2
} from "lucide-react";

type Task = {
  id: string;
  subject: string;
  deadline: string;
  completed?: boolean;
};

type StudySession = {
  id: string;
  user_id: string;
  plan_id: string;
  title: string;
  scheduled_date: string;
  duration_minutes: number;
  status: "pending" | "completed" | "skipped";
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [deadline, setDeadline] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("300");
  const [difficulty, setDifficulty] = useState("medium");
  const [priority, setPriority] = useState("medium");
  const [availableMinutes, setAvailableMinutes] = useState("60");
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [experience, setExperience] = useState("traditional_planner");
  const [experimentConnected, setExperimentConnected] = useState(false);
  const [active, setActive] = useState("Overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm your DeadlineZero study assistant. 👋\n\nI can help you prioritize subjects, create personalized revision plans, track your study progress, and stay ahead of upcoming deadlines.\n\nWhat would you like to work on today?"
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

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
          "study_planner_experience_v2"
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
            experiment
          );
          return;
        }

        setExperience(assignedExperience);
        setExperimentConnected(true);

        console.log(
          "[Flagsmith] Authenticated experiment participant:",
          session.user.id,
          "Variation:",
          assignedExperience
        );
      } catch (error) {
        console.error("[Flagsmith] Identity synchronization failed:", error);

        if (!cancelled && revision === identityRevision) {
          setExperimentConnected(false);
        }
      }
    }

    async function setupExperiment() {
      const environmentID =
        process.env.NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID;

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
        console.error(
          "[Flagsmith] Experiment initialization failed:",
          error
        );

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
              "id, user_id, plan_id, title, scheduled_date, duration_minutes, status"
            )
            .eq("user_id", session.user.id)
            .order("scheduled_date", { ascending: true }),
        ]);

        if (plansResult.error) throw plansResult.error;
        if (sessionsResult.error) throw sessionsResult.error;

        if (!active || currentRevision !== revision) return;

        setTasks((plansResult.data ?? []) as Task[]);
        setSessions((sessionsResult.data ?? []) as StudySession[]);
      } catch (error) {
        console.error("[Supabase] Failed to load user data:", error);

        if (active && currentRevision === revision) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not load your study data."
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
  async function createPlan() {
    if (!subject.trim() || !deadline) {
      setMessage("Enter a subject and deadline first.");
      return;
    }

    const studyMinutes = Number(estimatedMinutes);
    const dailyMinutes = Number(availableMinutes);

    if (!Number.isInteger(studyMinutes) || studyMinutes < 15 || studyMinutes > 10000) {
      setMessage("Study duration must be between 15 and 10000 minutes.");
      return;
    }

    if (isSmart && (!Number.isInteger(dailyMinutes) || dailyMinutes < 15 || dailyMinutes > 600)) {
      setMessage("Daily availability must be between 15 and 600 minutes.");
      return;
    }

    const currentDate = new Date();
    const todayString = [
      currentDate.getFullYear(),
      String(currentDate.getMonth() + 1).padStart(2, "0"),
      String(currentDate.getDate()).padStart(2, "0"),
    ].join("-");

    if (deadline <= todayString) {
      setMessage("Please select a future deadline.");
      return;
    }

    if (!userId) {
      router.push("/login");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("study_plans")
        .insert({
          user_id: userId,
          subject: subject.trim(),
          deadline,
          estimated_minutes: studyMinutes,
          difficulty: isSmart ? difficulty : "medium",
          priority: isSmart ? priority : "medium",
          available_minutes_per_day: isSmart ? dailyMinutes : 60,
        })
        .select("id, subject, deadline")
        .single();

      if (error) throw error;

      const generatedSessions: {
        user_id: string;
        plan_id: string;
        title: string;
        scheduled_date: string;
        duration_minutes: number;
        status: string;
      }[] = [];

      let remainingMinutes = studyMinutes;

      const cursor = new Date();
      cursor.setHours(12, 0, 0, 0);
      cursor.setDate(cursor.getDate() + 1);

      const finalDate = new Date(`${deadline}T12:00:00`);

      if (isSmart) {
      while (cursor <= finalDate && remainingMinutes >= 15) {
        let dailyRemaining = dailyMinutes;

        const sessionDate = [
          cursor.getFullYear(),
          String(cursor.getMonth() + 1).padStart(2, "0"),
          String(cursor.getDate()).padStart(2, "0"),
        ].join("-");

        while (dailyRemaining >= 15 && remainingMinutes >= 15) {
          const duration = Math.min(
            60,
            dailyRemaining,
            remainingMinutes
          );

          if (duration < 15) break;

          generatedSessions.push({
            user_id: userId!,
            plan_id: data.id,
            title: `${data.subject} - Study session`,
            scheduled_date: sessionDate,
            duration_minutes: duration,
            status: "pending",
          });

          remainingMinutes -= duration;
          dailyRemaining -= duration;
        }

        cursor.setDate(cursor.getDate() + 1);
      }
      }

      if (generatedSessions.length > 0) {
        const { error: sessionError } = await supabase
          .from("study_sessions")
          .insert(generatedSessions);

        if (sessionError) {
          console.error("Session creation error:", sessionError);
          setMessage("Plan saved, but study sessions could not be generated: " + sessionError.message);
        } else {
          const { data: savedSessions, error: reloadError } = await supabase
            .from("study_sessions")
            .select("id, user_id, plan_id, title, scheduled_date, duration_minutes, status")
            .eq("user_id", userId)
            .order("scheduled_date", { ascending: true });
          if (reloadError) console.error(reloadError);
          else setSessions((savedSessions ?? []) as StudySession[]);
        }
      }

      setTasks((old) => [...old, data]);

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

      setSubject("");
      setDeadline("");
      setMessage("Your study plan has been saved.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Could not save your plan."
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateSessionStatus(session: StudySession) {
    const nextStatus = session.status === "completed" ? "pending" : "completed";
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

    setSessions((current) => current.map((item) =>
      item.id === session.id ? { ...item, status: nextStatus } : item
    ));

    if (nextStatus === "completed") {
      try {
        flagsmith.trackEvent("study_session_completed", {
          metadata: { source: "deadlinezero_calendar", session_id: session.id },
        });
        await flagsmith.flushEvents();
      } catch (trackingError) {
        console.error("Session completion event error:", trackingError);
      }
    }
    setMessage(nextStatus === "completed" ? "Study session completed. Great work!" : "Session moved back to pending.");
  }

  async function removePlan(id: string) {
    const { error } = await supabase
      .from("study_plans")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage("Could not delete this plan.");
      return;
    }

    setTasks((old) => old.filter((task) => task.id !== id));
    setSessions((old) => old.filter((session) => session.plan_id !== id));
    setMessage("Study plan removed.");
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setMessage("Unable to sign out.");
      return;
    }
    router.push("/login");
    router.refresh();
  }

  async function sendChatMessage(text?: string) {
    const messageText = (text ?? chatInput).trim();
    if (!messageText || chatLoading) return;

    if (!userId) {
      router.push("/login");
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", content: messageText }
    ];

    setChatMessages([
      ...nextMessages,
      { role: "assistant", content: "" }
    ]);

    setChatInput("");
    setChatError("");
    setChatLoading(true);

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/assistant", {
        method: "POST",
        signal: AbortSignal.timeout(120000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          message: messageText,
          history: nextMessages.slice(-9, -1).map((item) => ({
            role: item.role === "assistant" ? "model" : "user",
            text: item.content
          })),
          context: {
            studyPlans: tasks,
            studySessions: sessions.slice(0, 30),
            progress: {
              totalPlans: tasks.length,
              totalSessions: sessions.length,
              completedSessions: completedSessions.length,
              completedMinutes,
              completionRate,
              currentStreak
            }
          }
        })
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "The AI assistant could not respond. Please try again."
        );
      }

      if (!response.body) {
        throw new Error("Streaming is not supported by this response.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      

      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        setChatMessages((current) => {
          const updated = [...current];
          const last = updated[updated.length - 1];

          if (last?.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: last.content + chunk
            };
          }

          return updated;
        });
      }

      const finalChunk = decoder.decode();

      if (finalChunk) {
        setChatMessages((current) => {
          const updated = [...current];
          const last = updated[updated.length - 1];

          if (last?.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: last.content + finalChunk
            };
          }

          return updated;
        });
      }

    } catch (error) {
      console.error("AI assistant request failed:", error);

      setChatError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );

      setChatMessages((current) => {
        const updated = [...current];

        if (
          updated.length > 0 &&
          updated[updated.length - 1].role === "assistant" &&
          !updated[updated.length - 1].content
        ) {
          updated.pop();
        }

        return updated;
      });
    } finally {
      setChatLoading(false);
    }
  }


const [today, setToday] = useState<string | null>(null);

useEffect(() => {
  const frame = window.requestAnimationFrame(() => {
    const currentDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    setToday(currentDate);
  });

  return () => window.cancelAnimationFrame(frame);
}, []);
const upcoming = tasks.filter(
  (task) => today && task.deadline >= today
);

const completedSessions = sessions.filter((session) => session.status === "completed");
const totalScheduledMinutes = sessions.reduce((sum, session) => sum + session.duration_minutes, 0);
const completedMinutes = completedSessions.reduce((sum, session) => sum + session.duration_minutes, 0);
const completionRate = sessions.length ? Math.round((completedSessions.length / sessions.length) * 100) : 0;
const weekSessions = sessions.filter((session) => {
  if (!today) return false;
  const start = new Date(`${today}T12:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const date = new Date(`${session.scheduled_date}T12:00:00`);
  return date >= start && date <= end;
});
const completedDateSet = new Set(completedSessions.map((session) => session.scheduled_date));
let currentStreak = 0;
if (today) {
  const cursor = new Date(`${today}T12:00:00`);
  while (completedDateSet.has([cursor.getFullYear(), String(cursor.getMonth() + 1).padStart(2, "0"), String(cursor.getDate()).padStart(2, "0")].join("-"))) {
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
}

  const navItems = [
    { label: "Overview", icon: LayoutDashboard, href: "#overview" },
    { label: "My study plans", icon: BookOpen, href: "#planner" },
    { label: "Calendar", icon: CalendarDays, href: "#calendar" },
    { label: "Progress", icon: ChartNoAxesCombined, href: "#progress" },
    { label: "AI Study Assistant", icon: Bot, href: "#ai-assistant" },
  ];

  return (
    <main id="dz-dashboard" className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <div className="flex min-h-screen">

        {mobileMenu && (
          <button
            aria-label="Close menu"
            onClick={() => setMobileMenu(false)}
            className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          />
        )}

        <aside className={`fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col border-r border-slate-200/80 bg-white px-5 py-6 shadow-[8px_0_32px_rgba(31,35,75,0.025)] transition-transform lg:static lg:translate-x-0 ${
          mobileMenu ? "translate-x-0" : "-translate-x-full"
        }`}>
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 text-white shadow-lg shadow-indigo-600/20">
                <GraduationCap size={23} />
              </div>
              <div>
                <h1 className="text-[19px] font-extrabold tracking-tight text-slate-900">
                  Deadline<span className="text-indigo-600">Zero</span>
                </h1>
                <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400">
                  STUDENT WORKSPACE
                </p>
              </div>
            </div>
            <button onClick={() => setMobileMenu(false)} className="lg:hidden">
              <X size={20} />
            </button>
          </div>

          <div className="mt-10">
            <p className="mb-3 px-3 text-[10px] font-extrabold tracking-[0.16em] text-slate-400">
              WORKSPACE
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => {
                      setActive(item.label);
                      setMobileMenu(false);
                    }}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                      active === item.label
                        ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100/70"
                        : "text-slate-500 hover:bg-slate-50 hover:text-indigo-700"
                    }`}
                  >
                    <Icon size={19} />
                    {item.label}
                    {item.label === "AI Study Assistant" && (
                      <span className="ml-auto rounded-md bg-violet-100 px-2 py-0.5 text-[9px] font-bold text-violet-700">
                        AI
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>
          </div>

          <div className="mt-9">
            <p className="mb-3 px-3 text-[10px] font-extrabold tracking-[0.16em] text-slate-400">
              PREFERENCES
            </p>
            <a
              href="#settings"
              onClick={() => setActive("Settings")}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50"
            >
              <Settings size={19} /> Settings
            </a>
          </div>

          <div className="mt-auto">
            <div className="rounded-2xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
              <div className="flex items-center gap-2 text-indigo-700">
                <Sparkles size={17} />
                <span className="text-xs font-bold">Keep moving forward</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Small study sessions create meaningful academic progress.
              </p>
            </div>

            <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">
                {email ? email[0].toUpperCase() : "S"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold">
                  {email || "Student account"}
                </p>
                <p className="text-[10px] text-slate-400">Personal workspace</p>
              </div>
              <button onClick={signOut} title="Sign out" className="text-slate-400 hover:text-rose-600">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200/80 bg-white/85 px-5 backdrop-blur-xl sm:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenu(true)}
                className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
              >
                <Menu size={21} />
              </button>
              <div>
                <p className="text-xs text-slate-400">Workspace / Overview</p>
                <p className="text-sm font-bold">Your academic command center</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2.5 text-xs text-slate-500 sm:flex">
                <Search size={15} /> Your workspace
              </div>
              <button
                aria-label="Notifications"
                className="relative rounded-xl border border-slate-200/80 bg-white p-2.5 text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
              >
                <Bell size={18} />
              </button>
              <div className={`hidden items-center gap-2 rounded-full px-3 py-2 text-[10px] font-bold sm:flex ${
                experimentConnected
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}>
                <span className="h-2 w-2 rounded-full bg-current" />
                {experimentConnected ? "Experiment live" : "Connecting"}
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1450px] space-y-7 p-5 sm:p-8">

            <section id="overview" className="dz-fade-up flex flex-col justify-between gap-5 rounded-3xl border border-white/80 bg-white/75 p-6 shadow-[0_8px_32px_rgba(31,35,75,0.035)] backdrop-blur-sm sm:flex-row sm:items-end sm:p-8">
              <div>
                <p className="text-xs font-bold tracking-[0.16em] text-indigo-600">
                  YOUR PERSONAL STUDY SPACE
                </p>
                <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-slate-900 sm:text-4xl">
                  Welcome back<span className="text-indigo-600">.</span>
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Let&apos;s make today count. Your next academic milestone starts here.
                </p>
              </div>
              <a href="#planner" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/25">
                <Plus size={17} /> Create study plan
              </a>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Total study plans", value: tasks.length, icon: BookOpen, color: "blue", note: "Saved in your workspace" },
                { label: "Upcoming deadlines", value: upcoming.length, icon: Clock3, color: "amber", note: "On your schedule" },
                { label: "Completed sessions", value: completedSessions.length, icon: CheckCircle2, color: "emerald", note: "Keep building momentum" },
                { label: "Planner experience", value: isSmart ? "Smart" : "Traditional", icon: Sparkles, color: "violet", note: "Your experiment variation" },
              ].map((stat) => {
                const Icon = stat.icon;
                const colorMap: Record<string, string> = {
                  blue: "bg-blue-50 text-indigo-600",
                  amber: "bg-amber-50 text-amber-600",
                  emerald: "bg-emerald-50 text-emerald-600",
                  violet: "bg-violet-50 text-violet-600",
                };
                return (
                  <div key={stat.label} className="dz-card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
                      <div className={`rounded-xl p-2.5 ${colorMap[stat.color]}`}>
                        <Icon size={19} />
                      </div>
                    </div>
                    <p className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900">{stat.value}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{stat.note}</p>
                  </div>
                );
              })}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
              <div id="planner" className="dz-card rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
                      <Target size={16} /> STUDY PLANNER
                    </div>
                    <h3 className="mt-2 text-xl font-bold">
                      {isSmart ? "Build your study plan" : "Add a study task"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {isSmart
                        ? "Your guided planning experience is enabled."
                        : "Add a subject and set your target deadline."}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${
                    isSmart ? "bg-violet-50 text-violet-700" : "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100/70"
                  }`}>
                    {isSmart ? "SMART EXPERIENCE" : "TRADITIONAL EXPERIENCE"}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-xs font-semibold text-slate-600">
                      Subject or task name
                    </label>
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Data Structures — Unit 1"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-600">
                      Estimated study duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="15"
                      max="10000"
                      step="15"
                      value={estimatedMinutes}
                      onChange={(e) => setEstimatedMinutes(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                    />
                  </div>

                  {isSmart && (
                    <>
                      <div>
                        <label className="mb-2 block text-xs font-semibold text-slate-600">
                          Available study time per day (minutes)
                        </label>
                        <input
                          type="number"
                          min="15"
                          max="600"
                          step="15"
                          value={availableMinutes}
                          onChange={(e) => setAvailableMinutes(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-semibold text-slate-600">
                          Difficulty
                        </label>
                        <select
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-semibold text-slate-600">
                          Priority
                        </label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-600">
                      Target deadline
                    </label>
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={createPlan}
                      disabled={saving || authLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/15 transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50"
                    >
                      <Plus size={17} />
                      {saving ? "Saving plan..." : "Save study plan"}
                    </button>
                  </div>
                </div>

                {message && (
                  <p className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-700">
                    {message}
                  </p>
                )}
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-7 text-white shadow-xl shadow-indigo-600/15">
                <div className="flex items-center gap-2 text-indigo-100">
                  <Sparkles size={18} />
                  <span className="text-xs font-bold tracking-wide">YOUR STUDY INSIGHT</span>
                </div>
                <h3 className="mt-5 text-2xl font-bold leading-snug">
                  Progress begins with a plan.
                </h3>
                <p className="mt-3 text-sm leading-6 text-indigo-100">
                  {tasks.length
                    ? `You have ${tasks.length} saved study plan${tasks.length === 1 ? "" : "s"}. Keep your next deadline in sight and make steady progress.`
                    : "Add your first subject and deadline. Your academic workspace will grow with every plan you create."}
                </p>
                <div className="mt-7 flex items-center justify-between border-t border-white/20 pt-4">
                  <span className="text-xs text-indigo-100">One step at a time</span>
                  <ArrowUpRight size={19} />
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
              <div className="dz-card rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-indigo-600">YOUR WORKSPACE</p>
                    <h3 className="mt-1 text-xl font-bold">Upcoming study plans</h3>
                  </div>
                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                    {tasks.length} total
                  </span>
                </div>

                {authLoading ? (
                  <p className="py-12 text-center text-sm text-slate-400">Loading your plans...</p>
                ) : !userId ? (
                  <div className="py-12 text-center">
                    <p className="text-sm font-semibold">Sign in to access your plans.</p>
                    <button onClick={() => router.push("/login")} className="mt-4 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white shadow-md shadow-indigo-600/15 transition hover:bg-indigo-700">
                      Sign in
                    </button>
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/20 px-5 py-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-indigo-600">
                      <BookOpen size={22} />
                    </div>
                    <p className="mt-4 text-sm font-bold">Your workspace is ready</p>
                    <p className="mt-1 text-xs text-slate-400">Create your first study plan to get started.</p>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {tasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-indigo-100 hover:bg-indigo-50/30">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                          <BookOpen size={19} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{task.subject}</p>
                          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                            <CalendarDays size={13} /> Deadline: {task.deadline}
                          </p>
                        </div>
                        <button
                          onClick={() => removePlan(task.id)}
                          title="Delete plan"
                          className="rounded-lg p-2 text-slate-300 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div id="calendar" className="dz-card rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-indigo-600">DEADLINE OVERVIEW</p>
                      <h3 className="mt-1 text-lg font-bold">Next milestones</h3>
                    </div>
                    <CalendarDays className="text-slate-400" size={20} />
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500">Next 7 days</p>
                    <span className="text-[10px] text-slate-400">{weekSessions.length} sessions</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {sessionsLoading ? (
                      <p className="py-5 text-center text-xs text-slate-400">Loading calendar...</p>
                    ) : weekSessions.length ? weekSessions.map((session) => (
                      <div key={session.id} className="flex items-center gap-3 rounded-2xl border border-slate-100/80 bg-white p-3 transition-all hover:border-indigo-100 hover:shadow-sm">
                        <div className={`h-9 w-1 rounded-full ${session.status === "completed" ? "bg-emerald-500" : "bg-indigo-500"}`} />
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-xs font-bold ${session.status === "completed" ? "text-slate-400 line-through" : "text-slate-800"}`}>{session.title}</p>
                          <p className="text-[11px] text-slate-400">{session.scheduled_date} · {session.duration_minutes} min</p>
                        </div>
                        <button onClick={() => updateSessionStatus(session)} title={session.status === "completed" ? "Undo completion" : "Mark completed"} className={`rounded-lg p-2 ${session.status === "completed" ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:bg-blue-50 hover:text-indigo-600"}`}>
                          {session.status === "completed" ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        </button>
                      </div>
                    )) : (
                      <p className="py-5 text-center text-xs text-slate-400">No study sessions scheduled in the next 7 days.</p>
                    )}
                  </div>
                </div>

                <div id="progress" className="dz-card rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Flame size={18} className="text-orange-500" />
                    <h3 className="text-sm font-bold">Your progress</h3>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                      <p className="text-[10px] text-slate-400">Study time completed</p>
                      <p className="mt-1 text-lg font-extrabold">{(completedMinutes / 60).toFixed(1)}h</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                      <p className="text-[10px] text-slate-400">Current streak</p>
                      <p className="mt-1 flex items-center gap-1 text-lg font-extrabold">{currentStreak} <Flame size={15} className="text-orange-500" /></p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Completion rate</span>
                    <span className="font-bold text-indigo-700">{completionRate}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-500" style={{ width: `${completionRate}%` }} />
                  </div>
                  <p className="mt-2 text-[10px] text-slate-400">{completedSessions.length} of {sessions.length} sessions completed · {(totalScheduledMinutes / 60).toFixed(1)}h scheduled</p>
                </div>
              </div>
            </section>

            <section className="dz-card rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-indigo-600">YOUR SCHEDULE</p>
                  <h3 className="mt-1 text-xl font-bold">All study sessions</h3>
                  <p className="mt-1 text-xs text-slate-400">Mark a session complete when you finish studying.</p>
                </div>
                <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">{sessions.length} total</span>
              </div>
              <div className="mt-5 space-y-2">
                {sessionsLoading ? (
                  <p className="py-8 text-center text-sm text-slate-400">Loading study sessions...</p>
                ) : sessions.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">Your generated study sessions will appear here.</p>
                ) : sessions.map((session) => (
                  <div key={session.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100/80 bg-white p-4 transition-all hover:border-indigo-100 hover:shadow-sm">
                    <button onClick={() => updateSessionStatus(session)} aria-label={session.status === "completed" ? "Undo completion" : "Mark completed"} className={session.status === "completed" ? "text-emerald-600" : "text-slate-300 hover:text-indigo-600"}>
                      {session.status === "completed" ? <CheckCircle2 size={21} /> : <Circle size={21} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-bold ${session.status === "completed" ? "text-slate-400 line-through" : "text-slate-800"}`}>{session.title}</p>
                      <p className="mt-1 text-xs text-slate-400">{session.scheduled_date} · {session.duration_minutes} minutes</p>
                    </div>
                    <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide ${session.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{session.status}</span>
                  </div>
                ))}
              </div>
            </section>

            <section id="ai-assistant" className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white p-5 sm:p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <Bot size={25} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">DeadlineZero AI Study Assistant</h3>
                    
                    <span title="Your AI study assistant is ready." className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      ASSISTANT READY
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Get study advice based on your saved plans, upcoming sessions, and progress.
                  </p>
                </div>
                <Sparkles className="hidden text-violet-300 sm:block" size={25} />
              </div>

              <div
                className="max-h-[420px] min-h-[180px] space-y-4 overflow-y-auto p-5 sm:p-6"
                aria-live="polite"
                aria-label="AI assistant conversation"
              >
                {chatMessages.map((item, index) => (
                  <div
                    key={`${item.role}-${index}`}
                    className={`flex gap-3 ${item.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {item.role === "assistant" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                        <Bot size={17} />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${
                        item.role === "user"
                          ? "rounded-br-md bg-blue-600 text-white"
                          : "rounded-bl-md bg-slate-50 text-slate-700"
                      }`}
                    >
                      {item.content}
                    </div>
                    {item.role === "user" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xs font-bold text-indigo-700">
                        {email ? email[0].toUpperCase() : "S"}
                      </div>
                    )}
                  </div>
                ))}

                {chatLoading &&
                  chatMessages[chatMessages.length - 1]?.role === "assistant" &&
                  !chatMessages[chatMessages.length - 1]?.content && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="flex items-center gap-3 text-sm text-slate-500"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                        <Bot size={17} />
                      </div>

                      <div className="flex items-center gap-3 rounded-2xl rounded-bl-md border border-violet-100 bg-violet-50/70 px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-violet-500" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-violet-500 [animation-delay:150ms]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-violet-500 [animation-delay:300ms]" />
                        </div>
                        <span className="text-xs font-medium text-violet-700">
                          DeadlineZero AI is thinking...
                        </span>
                      </div>
                    </div>
                  )}
              </div>

              {chatError && (
                <div role="alert" className="mx-5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700 sm:mx-6">
                  {chatError}
                </div>
              )}

              <div className="border-t border-slate-100 p-5 sm:p-6">
                <form
                  className="flex items-end gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void sendChatMessage();
                  }}
                >
                  <textarea
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendChatMessage();
                      }
                    }}
                    disabled={!userId || chatLoading}
                    rows={2}
                    maxLength={4000}
                    placeholder={userId ? "Ask your study assistant anything..." : "Sign in to chat with your study assistant."}
                    className="min-h-[64px] max-h-36 flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-5 py-4 text-[15px] leading-6 text-slate-800 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 placeholder:font-normal hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-100/80 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!userId || chatLoading || !chatInput.trim()}
                    aria-label="Send message"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-600/15 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {chatLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </form>
                <p className="mt-2 text-[10px] text-slate-400">
                  Enter to send · Shift + Enter for a new line · AI suggestions should be reviewed before changing your schedule.
                </p>
              </div>
            </section>

            <footer className="flex flex-col justify-between gap-2 border-t border-slate-200 py-5 text-[11px] text-slate-400 sm:flex-row">
              <span>© 2026 DeadlineZero · Built by Team Vortex</span>
              <span>Powered by Supabase and Flagsmith</span>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}




















