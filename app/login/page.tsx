"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  BookOpen,
  ChartNoAxesCombined,
  Sparkles,
  Target,
  LockKeyhole,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (!data.session) {
          setMessage(
            "Account created! Please check your email to confirm your account."
          );
        } else {
          router.push("/");
          router.refresh();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.push("/");
        router.refresh();
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  const features = [
    {
      icon: CalendarCheck,
      title: "Smart Planning",
      description: "Create realistic study plans",
      color: "violet",
    },
    {
      icon: ChartNoAxesCombined,
      title: "Progress Tracking",
      description: "Track, analyze and improve",
      color: "emerald",
    },
    {
      icon: Sparkles,
      title: "AI Study Assistant",
      description: "Get instant academic help",
      color: "purple",
    },
    {
      icon: Target,
      title: "Deadline Focus",
      description: "Prioritize what matters most",
      color: "blue",
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbfaff] text-slate-900">
      <div className="pointer-events-none absolute -right-48 top-36 h-[480px] w-[480px] rounded-full bg-violet-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 left-0 h-[420px] w-[420px] rounded-full bg-emerald-100/50 blur-3xl" />

      <header className="relative z-10 flex h-[76px] items-center justify-between border-b border-violet-100/80 bg-white/80 px-6 backdrop-blur-xl sm:px-10 lg:px-16">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <CalendarCheck size={25} strokeWidth={2.5} />
          </div>
          <span className="text-xl font-extrabold tracking-tight">
            Deadline<span className="text-violet-700">Zero</span>
          </span>
          <span className="hidden rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 sm:inline-flex">
            AI Study Assistant
          </span>
        </div>

        <div className="hidden items-center gap-3 text-sm font-semibold text-slate-600 sm:flex">
          <span className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700">
            <GraduationCap size={18} />
            Student Productivity
          </span>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-76px)] max-w-[1450px] items-center gap-12 px-5 py-12 lg:grid-cols-[1fr_0.95fr] lg:gap-16 lg:px-16">
        <section className="mx-auto w-full max-w-[590px]">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            <Sparkles size={17} />
            Your Smart Academic Companion
          </div>

          <h1 className="text-4xl font-extrabold leading-[1.12] tracking-tight text-[#172554] sm:text-5xl lg:text-[54px]">
            Plan. Study. Execute.
            <br />
            Before the{" "}
            <span className="relative inline-block text-violet-700">
              Deadline.
              <span className="absolute -bottom-2 left-0 h-1 w-full rounded-full bg-emerald-300" />
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            An AI-powered study assistant that helps you plan better, stay
            consistent, and never miss an academic deadline.
          </p>

          <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;
              const isGreen = feature.color === "emerald";

              return (
                <div
                  key={feature.title}
                  className="flex items-center gap-4 rounded-2xl border border-violet-100/80 bg-white/85 p-4 shadow-[0_8px_28px_rgba(66,48,130,0.05)] transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                      isGreen
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-violet-50 text-violet-700"
                    }`}
                  >
                    <Icon size={25} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {feature.title}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative mt-10 hidden overflow-hidden rounded-[28px] border border-violet-100 bg-gradient-to-br from-violet-100 via-white to-emerald-50 p-7 sm:block">
            <div className="relative z-10 flex items-center justify-between">
              <div className="max-w-[270px]">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
                  Your next achievement
                </span>
                <h2 className="mt-3 text-2xl font-extrabold leading-tight text-slate-900">
                  Stay ahead of every deadline.
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Plan smarter, study focused, and make every session count.
                </p>
              </div>
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[30px] bg-white text-violet-700 shadow-xl shadow-violet-200/60">
                <BookOpen size={55} strokeWidth={1.5} />
              </div>
            </div>
            <div className="absolute -bottom-12 -right-10 h-40 w-40 rounded-full bg-emerald-200/40 blur-2xl" />
          </div>
        </section>

        <section className="mx-auto w-full max-w-[560px]">
          <div className="rounded-[30px] border border-violet-100 bg-white p-6 shadow-[0_20px_70px_rgba(76,44,160,0.10)] sm:p-9 lg:p-11">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <CalendarCheck size={39} strokeWidth={2.3} />
              </div>

              <h2 className="mt-4 text-3xl font-extrabold tracking-tight">
                Deadline<span className="text-violet-700">Zero</span>
              </h2>
              <p className="mt-1 text-xs font-semibold tracking-[0.16em] text-slate-400">
                AI STUDY ASSISTANT
              </p>

              <h3 className="mt-8 text-2xl font-bold text-slate-900">
                {isSignup ? "Create your account" : "Welcome Back 👋"}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {isSignup
                  ? "Start building better study habits today."
                  : "Sign in to continue your study journey."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"
                >
                  <Mail size={17} className="text-violet-700" />
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-violet-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"
                >
                  <LockKeyhole size={17} className="text-violet-700" />
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      isSignup ? "new-password" : "current-password"
                    }
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-violet-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-700"
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              {message && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm leading-5 text-violet-800"
                >
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 to-violet-800 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Please wait..."
                  : isSignup
                    ? "Create Account"
                    : "Sign In"}
                {!loading && <ArrowRight size={19} />}
              </button>
            </form>

            <div className="mt-7 border-t border-slate-100 pt-6 text-center">
              <p className="text-sm text-slate-500">
                {isSignup
                  ? "Already have an account?"
                  : "Don't have an account?"}
                {" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignup(!isSignup);
                    setMessage("");
                  }}
                  className="font-bold text-violet-700 hover:text-violet-900 hover:underline"
                >
                  {isSignup ? "Sign in" : "Create one"}
                </button>
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Secure student access · Built for better academic productivity
          </p>
        </section>
      </div>
    </main>
  );
}
