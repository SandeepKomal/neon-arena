// Deterministic fake data for previews and tests. Nothing here is real.

export function sampleData() {
  let seed = 424242;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };

  const start = Date.UTC(2025, 9, 5);
  const weeks = [];
  for (let w = 0; w < 53; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start + (w * 7 + d) * 86400000).toISOString().slice(0, 10);
      const workday = d > 0 && d < 6;
      const season = 0.6 + 0.4 * Math.sin(w / 6) + (w > 28 && w < 38 ? 0.5 : 0);
      const active = rand() < (workday ? 0.8 : 0.3);
      let count = active ? Math.round(rand() ** 1.6 * 15 * season) : 0;
      if (w === 34 && d === 3) count = 29;
      week.push({ date, count });
    }
    weeks.push(week);
  }

  return {
    name: "Ada Example",
    login: "ada-example",
    generatedAt: "2026-10-01",
    weeks,
    repos: [
      { name: "infra-modules", stars: 14, color: "#844fba" },
      { name: "pipeline-kit", stars: 9, color: "#4298b8" },
      { name: "shop-service", stars: 6, color: "#3572a5" },
      { name: "ops-notes", stars: 4, color: "#89e051" },
      { name: "dotfiles", stars: 2, color: "#f1e05a" },
    ],
  };
}
