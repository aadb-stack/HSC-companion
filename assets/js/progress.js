// Syllabus progress math shared by the dashboard and syllabus views.
import { toMillis } from "./store.js";

export function chapterCount(syllabus, subjectId) {
  return syllabus.subjects[subjectId]?.chapters?.length || 0;
}
export function doneList(profile, subjectId) {
  return (profile.progress && profile.progress[subjectId]) || [];
}
export function doneCount(profile, subjectId) {
  return doneList(profile, subjectId).length;
}
export function subjectPct(profile, syllabus, subjectId) {
  const total = chapterCount(syllabus, subjectId);
  return total ? Math.round((doneCount(profile, subjectId) / total) * 100) : 0;
}

// Overall % across the chosen stream's subjects that actually have a syllabus.
export function overallProgress(profile, syllabus, subjects) {
  let done = 0, total = 0;
  for (const s of subjects) {
    const t = chapterCount(syllabus, s.id);
    if (!t) continue;
    total += t;
    done += Math.min(doneCount(profile, s.id), t);
  }
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

// Study streak: consecutive days (ending today) that have ≥1 logged session.
export function computeStreak(sessions) {
  const days = new Set(sessions.map((s) => new Date(toMillis(s.at)).toDateString()));
  let streak = 0;
  const d = new Date();
  // allow the streak to "hold" if you've studied today OR yesterday
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (days.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

export function minutesToday(sessions) {
  const today = new Date().toDateString();
  return sessions.filter((s) => new Date(toMillis(s.at)).toDateString() === today)
                 .reduce((a, s) => a + (s.minutes || 0), 0);
}
export function minutesTotal(sessions) {
  return sessions.reduce((a, s) => a + (s.minutes || 0), 0);
}
