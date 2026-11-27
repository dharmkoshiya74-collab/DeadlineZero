const difficulties = ["easy", "medium", "hard"] as const;
const priorities = ["low", "medium", "high"] as const;
const deadlineSources = ["provided", "suggested"] as const;

export type PlanDifficulty = (typeof difficulties)[number];
export type PlanPriority = (typeof priorities)[number];
export type PlanDeadlineSource = (typeof deadlineSources)[number];

export type AssistantPlanDraft = {
  subject: string;
  deadline: string;
  deadlineSource: PlanDeadlineSource;
  estimatedMinutes: number;
  availableMinutes: number;
  difficulty: PlanDifficulty;
  priority: PlanPriority;
  steps: string[];
};

export type AssistantResponse = {
  answer: string;
  plan: AssistantPlanDraft | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(
  value: unknown,
  options: readonly T[],
): value is T {
  return typeof value === "string" && options.some((option) => option === value);
}

export function isCalendarDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isAssistantPlanDraft(
  value: unknown,
): value is AssistantPlanDraft {
  if (!isRecord(value)) return false;

  return (
    typeof value.subject === "string" &&
    value.subject.trim().length > 0 &&
    value.subject.trim().length <= 120 &&
    isCalendarDateKey(value.deadline) &&
    isOneOf(value.deadlineSource, deadlineSources) &&
    Number.isInteger(value.estimatedMinutes) &&
    Number(value.estimatedMinutes) >= 15 &&
    Number(value.estimatedMinutes) <= 10000 &&
    Number.isInteger(value.availableMinutes) &&
    Number(value.availableMinutes) >= 15 &&
    Number(value.availableMinutes) <= 600 &&
    isOneOf(value.difficulty, difficulties) &&
    isOneOf(value.priority, priorities) &&
    Array.isArray(value.steps) &&
    value.steps.length >= 3 &&
    value.steps.length <= 5 &&
    value.steps.every(
      (step) =>
        typeof step === "string" &&
        step.trim().length > 0 &&
        step.trim().length <= 240,
    )
  );
}

export function isAssistantResponse(
  value: unknown,
): value is AssistantResponse {
  return (
    isRecord(value) &&
    typeof value.answer === "string" &&
    value.answer.trim().length > 0 &&
    value.answer.length <= 12000 &&
    (value.plan === null || isAssistantPlanDraft(value.plan))
  );
}
