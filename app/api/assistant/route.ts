import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!apiKey || !supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Server configuration is incomplete. Check environment variables." },
        { status: 500 }
      );
    }

    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in." },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authorization.slice(7));

    if (authError || !user) {
      return NextResponse.json(
        { error: "Your session is invalid. Please sign in again." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    if (!message || message.length > 4000) {
      return NextResponse.json(
        { error: "Message must contain between 1 and 4000 characters." },
        { status: 400 }
      );
    }

    let context = "No study information supplied.";

    if (typeof body.context === "object" && body.context !== null) {
      context = JSON.stringify(body.context).slice(0, 8000);
    }

    type HistoryItem = {
      role: "user" | "model";
      text: string;
    };

    const history = Array.isArray(body.history)
      ? body.history
          .slice(-4)
          .filter((item: unknown): item is HistoryItem => {
            if (!item || typeof item !== "object") return false;

            const candidate = item as Record<string, unknown>;

            return (
              (candidate.role === "user" || candidate.role === "model") &&
              typeof candidate.text === "string"
            );
          })
          .map(
            (item: HistoryItem) =>
              `${item.role === "user" ? "Student" : "Assistant"}: ${item.text.slice(0, 1000)}`
          )
          .join("\n")
      : "";

    const currentDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const groq = new Groq({ apiKey });

    const prompt = `
CURRENT DATE: ${currentDate}

STUDENT DATA:
${context}

RECENT CONVERSATION:
${history || "No previous conversation."}

STUDENT MESSAGE:
${message}

TASKS:
1. Analyze deadlines and prioritize urgent subjects.
2. Recommend realistic study schedules.
3. Analyze completed and pending sessions.
4. Suggest recovery plans for unfinished work.
5. Recommend improvements using actual progress.
6. Explain academic topics simply.

RULES:
- Never invent student records, dates, or statistics.
- Consider difficulty, priority, deadlines and available time.
- Give concise, practical answers.
- Never claim to save or modify database records.
- Ask one focused question if essential information is missing.
- Answer unrelated academic questions directly.
`;

    const groqStartedAt = Date.now();
    console.log("[AI DIAGNOSTIC] Starting Groq chat stream.");

    const groqStream = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content:
            "You are DeadlineZero AI, a fast, accurate and supportive academic assistant. Give practical, concise answers based on actual student data.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_completion_tokens: 2048,
      reasoning_effort: "low",
      include_reasoning: false,
      stream: true,
    });

    console.log(
      `[AI DIAGNOSTIC] Groq stream created in ${Date.now() - groqStartedAt}ms.`
    );

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          let receivedText = false;
          let firstChunkLogged = false;

          console.log("[AI DIAGNOSTIC] Waiting for Groq text chunks.");

          for await (const chunk of groqStream) {
            const text = chunk.choices[0]?.delta?.content;

            if (typeof text === "string" && text.length > 0) {
              if (!firstChunkLogged) {
                firstChunkLogged = true;
                console.log(
                  `[AI DIAGNOSTIC] First text chunk received after ${Date.now() - groqStartedAt}ms.`
                );
              }

              receivedText = true;
              controller.enqueue(encoder.encode(text));
            }
          }

          if (!receivedText) {
            controller.enqueue(
              encoder.encode("I couldn't generate a response. Please try again.")
            );
          }

          controller.close();
        } catch (error) {
          console.error("Groq content streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("DeadlineZero Groq API error:", error);

    const rawMessage =
      error instanceof Error ? error.message : String(error);

    const safeMessage = rawMessage
      .replace(/key=[^&\s]+/gi, "key=[REDACTED]")
      .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[REDACTED]");

    return NextResponse.json(
      { error: safeMessage || "The AI assistant is temporarily unavailable." },
      { status: 500 }
    );
  }
}








