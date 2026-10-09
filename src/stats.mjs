// Pure functions that turn a contribution calendar into summary numbers.
// A "calendar" is an array of weeks; a week is an array of { date, count }.

export function computeStats(weeks) {
  const days = weeks.flat();
  let longest = 0;
  let run = 0;
  let peak = { date: null, count: 0 };

  for (const day of days) {
    if (day.count > 0) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
    if (day.count > peak.count) peak = day;
  }

  // Current streak: walk backwards from the newest day. Today is allowed to be
  // empty (the day may not have started yet) without breaking the streak.
  let current = 0;
  let i = days.length - 1;
  if (i >= 0 && days[i].count === 0) i -= 1;
  while (i >= 0 && days[i].count > 0) {
    current += 1;
    i -= 1;
  }

  return {
    total: days.reduce((sum, d) => sum + d.count, 0),
    activeDays: days.filter((d) => d.count > 0).length,
    current,
    longest,
    peak,
    max: peak.count,
    weekly: weeks.map((w) => w.reduce((sum, d) => sum + d.count, 0)),
  };
}

// Maps a daily count to a colour level 0..4 relative to the busiest day.
export function levelOf(count, max) {
  if (count <= 0 || max <= 0) return 0;
  const r = count / max;
  if (r < 0.2) return 1;
  if (r < 0.45) return 2;
  if (r < 0.75) return 3;
  return 4;
}

// Maps a daily count to a colour level 0..4 using quartile thresholds
// [q1, q2, q3] of the active days.
export function levelByRank(count, [q1, q2, q3]) {
  if (count <= 0) return 0;
  if (count <= q1) return 1;
  if (count <= q2) return 2;
  if (count <= q3) return 3;
  return 4;
}
