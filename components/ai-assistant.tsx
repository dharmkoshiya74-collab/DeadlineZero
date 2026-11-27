"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState, MonoLabel, PageHeading, Panel } from "@/components/academic-ui";
import { MaterialIcon } from "@/components/material-icon";
import { StudyCompanionPicker } from "@/components/study-companions";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "@/lib/workspace-context";
import { calculateProgress, formatDate } from "@/lib/study-utils";
import {
  isAssistantResponse,
  type AssistantPlanDraft,
} from "@/lib/assistant-types";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  plan?: AssistantPlanDraft;
  planSaved?: boolean;
};

const initialMessage: ChatMessage = {
  role: "assistant",
  content:
    "Hi! Ask me about any subject, assignment, or study challenge. I’ll explain it clearly and can draft a practical study plan for you to review.",
};

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (!hours) return `${remainingMinutes} min`;
  return remainingMinutes
    ? `${hours} hr ${remainingMinutes} min`
    : `${hours} hr`;
}

export function AIAssistant() {
  const router = useRouter();
  const {
    tasks,
    sessions,
    userId,
    email,
    today,
    createPlan,
    saving,
    isSmart,
  } = useWorkspace();
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const streamRef = useRef<HTMLDivElement>(null);
  const progress = calculateProgress(sessions, today);
  const upcoming = tasks
    .filter((task) => today && task.deadline >= today)
    .sort((left, right) => left.deadline.localeCompare(right.deadline));
  const prompts = [
    "Help me prioritize my upcoming deadlines.",
    "Review my scheduled sessions for today.",
    upcoming[0]
      ? `Help me make a realistic study plan for ${upcoming[0].subject}.`
      : "Explain a topic and make me a study plan.",
  ];

  useEffect(() => {
    streamRef.current?.scrollTo({
      top: streamRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function sendMessage(text = input) {
    const messageText = text.trim();
    if (!messageText || loading) return;

    if (!userId) {
      router.push("/login");
      return;
    }

    const priorMessages = messages;
    const nextMessages: ChatMessage[] = [
      ...priorMessages,
      { role: "user", content: messageText },
    ];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setMessages(nextMessages);
        router.push("/login");
        return;
      }

      const response = await fetch("/api/assistant", {
        method: "POST",
        signal: AbortSignal.timeout(120000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: messageText,
          history: nextMessages.slice(-9, -1).map((item) => ({
            role: item.role === "assistant" ? "model" : "user",
            text: item.content,
          })),
          context: {
            studyPlans: tasks,
            studySessions: sessions.slice(0, 30),
            progress: {
              totalPlans: tasks.length,
              totalSessions: sessions.length,
              completedSessions: progress.completedSessions.length,
              completedMinutes: progress.completedMinutes,
              completionRate: progress.completionRate,
              currentStreak: progress.currentStreak,
            },
            today,
          },
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "The AI assistant could not respond. Please try again.",
        );
      }
      const result: unknown = await response.json();
      if (!isAssistantResponse(result)) {
        throw new Error("The AI assistant returned an invalid response. Please try again.");
      }

      setMessages((current) => {
        const updated = [...current];
        const lastIndex = updated.length - 1;
        const last = updated[lastIndex];
        if (last?.role === "assistant") {
          updated[lastIndex] = {
            ...last,
            content: result.answer,
            plan: result.plan ?? undefined,
            planSaved: false,
          };
        }
        return updated;
      });
    } catch (requestError) {
      console.error("AI assistant request failed:", requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong. Please try again.",
      );
      setMessages((current) => {
        const updated = [...current];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant" && !last.content) updated.pop();
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  async function saveAssistantPlan(
    messageIndex: number,
    plan: AssistantPlanDraft,
  ) {
    const saved = await createPlan({
      subject: plan.subject,
      deadline: plan.deadline,
      estimatedMinutes: String(plan.estimatedMinutes),
      difficulty: plan.difficulty,
      priority: plan.priority,
      availableMinutes: String(plan.availableMinutes),
    });

    if (saved) {
      setMessages((current) =>
        current.map((message, index) =>
          index === messageIndex ? { ...message, planSaved: true } : message,
        ),
      );
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  const primaryContext = upcoming[0];
  const recentSessions = [...sessions]
    .sort((left, right) => right.scheduled_date.localeCompare(left.scheduled_date))
    .slice(0, 4);

  return (
    <div className="page-stack assistant-page">
      <PageHeading
        eyebrow="A STUDY COMPANION"
        title="Talk through your next step"
        description="Ask any student question for a clear answer and a study plan you can review before saving."
      />
      <StudyCompanionPicker />
      <div className="assistant-telemetry">
        <div>
          <span className="status-dot online" />
          <MonoLabel>YOUR STUDY ASSISTANT</MonoLabel>
          <span className="telemetry-divider">/</span>
          <span>Context from your saved workspace</span>
        </div>
        <span className="assistant-context-status">
          {userId ? `${tasks.length} plans · ${sessions.length} sessions available` : "Sign in required"}
        </span>
      </div>

      <div className="assistant-layout">
        <aside className="assistant-context-column">
          <Panel className="context-panel" eyebrow="YOUR SAVED PLANS" title="Study context">
            {tasks.length ? (
              <div className="context-plan-list">
                {tasks.slice(0, 5).map((task) => (
                  <div className="context-plan" key={task.id}>
                    <span className="context-plan-dot" />
                    <div><strong>{task.subject}</strong><span>Deadline · {formatDate(task.deadline, { month: "short", day: "numeric" })}</span></div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No saved plans"
                description="Create a plan to include a deadline in the assistant context."
                action={<Link className="button-secondary" href="/study-planner">Open planner</Link>}
              />
            )}
          </Panel>

          <Panel className="context-panel" eyebrow="RECENT SESSION RECORDS" title="Study activity">
            {recentSessions.length ? (
              <div className="context-plan-list">
                {recentSessions.map((session) => (
                  <div className="context-plan" key={session.id}>
                    <span className={`context-plan-dot ${session.status}`} />
                    <div>
                      <strong>{session.title}</strong>
                      <span>{formatDate(session.scheduled_date, { month: "short", day: "numeric" })} · {session.duration_minutes} min · {session.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No session history" description="Scheduled and completed study sessions will appear here." />
            )}
          </Panel>

          <Panel className="context-panel prompt-panel" eyebrow="QUICK PROMPTS" title="Start with a question">
            <div className="prompt-list">
              {prompts.map((prompt) => (
                <button disabled={!userId || loading} key={prompt} onClick={() => void sendMessage(prompt)}>
                  <MaterialIcon name="auto_awesome" size={14} />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </Panel>
        </aside>

        <section aria-label="AI assistant conversation" className="assistant-thread">
          <header className="thread-header">
            <div className="thread-avatar"><MaterialIcon name="smart_toy" size={19} /></div>
            <div className="thread-header-copy">
              <strong>DeadlineZero AI</strong>
              <span>{userId ? "Ready to answer questions and draft study plans" : "Sign in to start a conversation"}</span>
            </div>
            <span className="thread-status"><span className="status-dot online" /> READY</span>
          </header>

          <div aria-live="polite" className="thread-messages" ref={streamRef}>
            {messages.map((message, index) => (
              <article
                className={`chat-message ${message.role}`}
                key={`${message.role}-${index}`}
              >
                {message.role === "assistant" && <div className="chat-avatar"><MaterialIcon name="smart_toy" size={15} /></div>}
                <div className="chat-message-content">
                  <div className="chat-message-meta">
                    <span>{message.role === "user" ? email || "You" : "DeadlineZero AI"}</span>
                    {message.role === "assistant" && message.content && <MaterialIcon name="check_circle" size={12} />}
                  </div>
                  <div className="chat-bubble">
                    {message.content || (loading && index === messages.length - 1 ? (
                      <span className="thinking-indicator"><i /><i /><i /> Thinking…</span>
                    ) : null)}
                  </div>
                  {message.plan && (
                    <section
                      aria-label="Suggested study plan"
                      className="assistant-plan-card"
                    >
                      <div className="assistant-plan-heading">
                        <span className="assistant-plan-icon">
                          <MaterialIcon name="auto_awesome" size={16} />
                        </span>
                        <div>
                          <p>AI STUDY PLAN</p>
                          <h3>{message.plan.subject}</h3>
                        </div>
                      </div>
                      <div className="assistant-plan-metrics">
                        <div>
                          <span>Deadline</span>
                          <strong>
                            {formatDate(message.plan.deadline, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </strong>
                          {message.plan.deadlineSource === "suggested" && (
                            <small>Suggested · editable</small>
                          )}
                        </div>
                        <div>
                          <span>Study time</span>
                          <strong>{formatMinutes(message.plan.estimatedMinutes)}</strong>
                        </div>
                        <div>
                          <span>Suggested daily availability</span>
                          <strong>{formatMinutes(message.plan.availableMinutes)}</strong>
                        </div>
                        <div>
                          <span>Level · priority</span>
                          <strong>
                            {message.plan.difficulty} · {message.plan.priority}
                          </strong>
                        </div>
                      </div>
                      <ol className="assistant-plan-steps">
                        {message.plan.steps.map((step, stepIndex) => (
                          <li key={`${stepIndex}-${step}`}>{step}</li>
                        ))}
                      </ol>
                      <p className="assistant-plan-note">
                        {isSmart
                          ? "Adding this plan also creates sessions with the Smart planner using the suggested daily availability."
                          : "Adding this plan saves it to Study Plans. Manual mode stores its default 60 min/day availability and does not auto-create sessions."}
                      </p>
                      <button
                        className="button-secondary assistant-plan-save"
                        disabled={!userId || saving || message.planSaved}
                        onClick={() => {
                          if (message.plan) {
                            void saveAssistantPlan(index, message.plan);
                          }
                        }}
                        type="button"
                      >
                        <MaterialIcon
                          name={message.planSaved ? "check_circle" : "add"}
                          size={16}
                        />
                        <span>
                          {message.planSaved ? "Added to study plans" : "Add to my study plans"}
                        </span>
                      </button>
                    </section>
                  )}
                </div>
                {message.role === "user" && <div className="chat-user-avatar">{email ? email.charAt(0).toUpperCase() : "S"}</div>}
              </article>
            ))}
          </div>

          {error && <div className="assistant-error" role="alert">{error}</div>}

          <form className="assistant-composer" onSubmit={onSubmit}>
            <label className="sr-only" htmlFor="assistant-message">Message the study assistant</label>
            <textarea
              disabled={!userId || loading}
              id="assistant-message"
              maxLength={4000}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder={userId ? "Ask about your deadlines, plans, progress, or a study topic…" : "Sign in to chat with the study assistant."}
              rows={2}
              value={input}
            />
            <button aria-label="Send message" className="button-primary" disabled={!userId || loading || !input.trim()} type="submit">
              {loading ? <MaterialIcon className="spin" name="progress_activity" size={16} /> : <MaterialIcon name="arrow_upward" size={16} />}
              <span>{loading ? "Sending" : "Send"}</span>
            </button>
            <div className="composer-hint">
              <span>Enter to send · Shift + Enter for a new line</span>
              <span>AI plans stay drafts until you choose to add them.</span>
            </div>
          </form>

          {primaryContext && (
            <div className="assistant-context-footer">
              <span className="status-dot violet" />
              <span>Context includes your next plan: <strong>{primaryContext.subject}</strong></span>
              <span className="assistant-context-count">{progress.completedSessions.length}/{sessions.length} completed</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
