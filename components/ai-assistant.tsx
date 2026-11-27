"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { EmptyState, MonoLabel, PageHeading, Panel } from "@/components/academic-ui";
import { MaterialIcon } from "@/components/material-icon";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "@/lib/workspace-context";
import { calculateProgress, formatDate } from "@/lib/study-utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const initialMessage: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I can help you review the study plans and sessions you’ve saved, or think through your next study block. What would you like to work on?",
};

export function AIAssistant() {
  const router = useRouter();
  const { tasks, sessions, userId, email, today } = useWorkspace();
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
      : "What can I do with the study data I have recorded?",
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
      if (!response.body) {
        throw new Error("Streaming is not supported by this response.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        setMessages((current) => {
          const updated = [...current];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: last.content + chunk,
            };
          }
          return updated;
        });
      }

      const finalChunk = decoder.decode();
      if (finalChunk) {
        setMessages((current) => {
          const updated = [...current];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: last.content + finalChunk,
            };
          }
          return updated;
        });
      }
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
        description="Ask about your saved plans, sessions, or a study topic."
      />
      <section aria-label="Study companions" className="assistant-companion-banner">
        <Image
          alt="Byte the red panda, Newton the cat, and Ada the axolotl"
          className="assistant-companion-art"
          height={576}
          src="/images/study-companions.png"
          width={1024}
        />
        <div>
          <MonoLabel>MEET YOUR STUDY COMPANIONS</MonoLabel>
          <h2>Byte · Newton · Ada</h2>
          <p>Friendly faces for the study plans and sessions you save here.</p>
        </div>
      </section>
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
              <span>{userId ? "Ready to help with your study data" : "Sign in to start a conversation"}</span>
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
              <span>Suggestions are not saved to your schedule.</span>
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
