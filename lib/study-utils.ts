export type StudyPlan = {
  id: string;
  subject: string;
  deadline: string;
  completed?: boolean;
};

export type StudySession = {
  id: string;
  user_id: string;
  plan_id: string;
  title: string;
  scheduled_date: string;
  duration_minutes: number;
  status: "pending" | "completed" | "skipped";
};

export type PlannedSlot = {
  scheduled_date: string;
  duration_minutes: number;
};

export function getDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function getTodayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function formatDate(
  key: string,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
) {
  return new Intl.DateTimeFormat("en", options).format(dateFromKey(key));
}

export function getWeekDates(anchor: Date) {
  const firstDay = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 12);
  const dayOffset = (firstDay.getDay() + 6) % 7;
  firstDay.setDate(firstDay.getDate() - dayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() + index);
    return date;
  });
}

export function generateStudySchedule(
  studyMinutes: number,
  dailyMinutes: number,
  deadline: string,
) {
  const generated: PlannedSlot[] = [];
  let remainingMinutes = studyMinutes;

  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1);

  const finalDate = new Date(`${deadline}T12:00:00`);

  while (cursor <= finalDate && remainingMinutes >= 15) {
    let dailyRemaining = dailyMinutes;
    const sessionDate = getDateKey(cursor);

    while (dailyRemaining >= 15 && remainingMinutes >= 15) {
      const duration = Math.min(60, dailyRemaining, remainingMinutes);
      if (duration < 15) break;

      generated.push({
        scheduled_date: sessionDate,
        duration_minutes: duration,
      });

      remainingMinutes -= duration;
      dailyRemaining -= duration;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return generated;
}

export function calculateProgress(sessions: StudySession[], today: string | null) {
  const completedSessions = sessions.filter((session) => session.status === "completed");
  const completedMinutes = completedSessions.reduce(
    (total, session) => total + session.duration_minutes,
    0,
  );
  const totalScheduledMinutes = sessions.reduce(
    (total, session) => total + session.duration_minutes,
    0,
  );
  const completionRate = sessions.length
    ? Math.round((completedSessions.length / sessions.length) * 100)
    : null;
  const completedDateSet = new Set(
    completedSessions.map((session) => session.scheduled_date),
  );

  let currentStreak = 0;
  if (today) {
    const cursor = dateFromKey(today);
    while (completedDateSet.has(getDateKey(cursor))) {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  return {
    completedSessions,
    completedMinutes,
    totalScheduledMinutes,
    completionRate,
    currentStreak,
  };
}
