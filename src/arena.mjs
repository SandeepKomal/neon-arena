// Neon Arena: the pieces that turn the 3D calendar into a lit stadium.
//
// - Front LED ticker: the slab's front face is a dot-matrix screen. Text is
//   drawn in the face's own plane through an affine matrix, so it sits on the
//   slab in true perspective, and scrolls the top repositories.
// - Back stadium board: an LED board stands along the back edge, behind the
//   bars, and scrolls the headline stats.
// - Streak light-cycle: a neon trail rides over the bar tops across the
//   longest streak, day by day, and ends in a tag.

const r1 = (n) => Math.round(n * 10) / 10;
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Affine matrix for one short stretch of a board, from local x0..x0+len along
// the board and 0..height down it. Under perspective a single matrix can't
// follow the whole board, so boards are drawn as many short stretches.
function stretchMatrix(project, u, v, hTop, len, height) {
  const o = project(u, v, hTop);
  const ex = project(u + len, v, hTop);
  const ey = project(u, v, hTop - height);
  const m = [(ex.x - o.x) / len, (ex.y - o.y) / len, (ey.x - o.x) / height, (ey.y - o.y) / height, o.x, o.y];
  return `matrix(${m.map((n) => Math.round(n * 1e4) / 1e4).join(" ")})`;
}

// One scrolling LED board. `items` are [text, colour] pairs; the run repeats
// so the scroll loops seamlessly. The text is defined once and placed into
// each stretch with <use>, so splitting the board costs almost nothing.
function ledBoard({ id, project, u0, length, v, hTop, height, items, t, animate, speed, direction, fontSize }) {
  const charW = fontSize * 0.62 + 2;
  const run = items.map(([s]) => s).join("").length;
  const runW = run * charW;
  const copies = Math.ceil(length / runW) + 2;
  const tspans = Array.from({ length: copies }, () =>
    items.map(([s, c]) => `<tspan fill="${c}">${esc(s)}</tspan>`).join("")
  ).join("");
  const baseline = r1(height / 2 + fontSize * 0.36);
  const dur = r1(runW / speed);
  const from = direction < 0 ? 0 : -runW;
  const to = direction < 0 ? -runW : 0;
  const scroll = animate
    ? `<animateTransform attributeName="transform" type="translate" values="${r1(from)} 0;${r1(to)} 0" dur="${dur}s" repeatCount="indefinite"/>`
    : "";
  const text = `<text y="${baseline}" font-family="ui-monospace, 'SF Mono', Menlo, Consolas, monospace" font-size="${fontSize}" font-weight="800" letter-spacing="2">${tspans}</text>`;
  const defs = `<mask id="${id}Dots" maskUnits="userSpaceOnUse" x="0" y="0" width="${r1(length)}" height="${r1(height)}"><rect width="${r1(length)}" height="${r1(height)}" fill="url(#ledDots)"/></mask>
  <g id="${id}Text"><g>${scroll}<g filter="url(#ledBloom)" opacity=".75">${text}</g><g mask="url(#${id}Dots)">${text}</g></g></g>`;

  // Panel: the true projected outline, then the text in short stretches.
  const corners = [project(u0, v, hTop), project(u0 + length, v, hTop), project(u0 + length, v, hTop - height), project(u0, v, hTop - height)];
  const outline = corners.map((q) => `${r1(q.x)},${r1(q.y)}`).join(" ");
  const parts = 16, seg = length / parts;
  let stretches = "";
  for (let k = 0; k < parts; k++) {
    const x0 = k * seg;
    stretches += `<clipPath id="${id}C${k}"><rect x="${r1(x0 - 0.4)}" width="${r1(seg + 0.8)}" height="${r1(height)}"/></clipPath>` +
      `<g transform="${stretchMatrix(project, u0 + x0, v, hTop, seg, height)} translate(${r1(-x0)} 0)" clip-path="url(#${id}C${k})"><use href="#${id}Text"/></g>`;
  }
  return {
    defs,
    svg: `<polygon points="${outline}" fill="${t.boardBg}"/>${stretches}<polygon points="${outline}" fill="url(#ledGloss)"/>`,
  };
}

// Smooth curve through points (Catmull-Rom converted to cubic Béziers), so
// the light-cycle flows over the bar tops instead of zigzagging between them.
function smoothPath(p) {
  if (p.length < 3) return "M" + p.map((q) => `${r1(q.x)},${r1(q.y)}`).join("L");
  let d = `M${r1(p[0].x)},${r1(p[0].y)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
    const c1 = { x: b.x + (c.x - a.x) / 6, y: b.y + (c.y - a.y) / 6 };
    const c2 = { x: c.x - (e.x - b.x) / 6, y: c.y - (e.y - b.y) / 6 };
    d += `C${r1(c1.x)},${r1(c1.y)} ${r1(c2.x)},${r1(c2.y)} ${r1(c.x)},${r1(c.y)}`;
  }
  return d;
}

// Rolling average of the streak's bar tops, so the trail follows the skyline's
// overall rise and fall rather than every single bar.
function ease(points, k = 2) {
  return points.map((_, i) => {
    const win = points.slice(Math.max(0, i - k), i + k + 1);
    return { x: win.reduce((s, q) => s + q.x, 0) / win.length, y: win.reduce((s, q) => s + q.y, 0) / win.length };
  });
}

function longestRun(days) {
  let best = { start: -1, len: 0 };
  let start = -1;
  days.forEach((d, i) => {
    if (d.count > 0) {
      if (start < 0) start = i;
      if (i - start + 1 > best.len) best = { start, len: i - start + 1 };
    } else start = -1;
  });
  return best;
}

export function arena({ data, stats, t, project, animate, geo, tops }) {
  const { U0, U1, V0, V1, depth } = geo;
  const length = U1 - U0;

  // Front ticker: top repositories in the neon palette.
  const repos = (data.repos || []).slice(0, 6).map((r) => ({
    name: String(r?.name ?? "").toUpperCase(),
    stars: Math.max(0, Math.floor(Number(r?.stars)) || 0),
  }));
  const frontItems = repos.length
    ? repos.flatMap((r, i) => [
        [" ◆ ", t.mute],
        [r.name, t.accents[i % t.accents.length]],
        [r.stars ? ` ★${r.stars}` : "", t.ink],
      ])
    : [[" ◆ NEON ARENA ", t.ink]];
  const front = ledBoard({
    id: "ledFront", project, u0: U0, length, v: V1, hTop: 0, height: depth,
    items: [[" TOP REPOS", t.ink], ...frontItems], t, animate, speed: 46, direction: -1, fontSize: 26,
  });

  // Back stadium board: headline stats.
  const peak = stats.peak.date ? (() => { const [, m, d] = stats.peak.date.split("-").map(Number); return `${MONTHS[m - 1] || ""} ${d}`.toUpperCase(); })() : "";
  const backItems = [
    [` @${String(data.login || "").toUpperCase()} `, t.glow],
    ["◆ ", t.mute], [`${stats.total.toLocaleString("en-US")} CONTRIBUTIONS `, t.ramp[1]],
    ["◆ ", t.mute], [`${stats.activeDays} ACTIVE DAYS `, t.ramp[2]],
    ["◆ ", t.mute], [`LONGEST STREAK ${stats.longest}D `, t.ramp[3]],
    ...(peak ? [["◆ ", t.mute], [`PEAK ${peak} · ${stats.max} `, t.peak]] : []),
  ];
  const backH = 44;
  const back = ledBoard({
    id: "ledBack", project, u0: U0, length, v: V0, hTop: backH, height: backH,
    items: backItems, t, animate, speed: 38, direction: 1, fontSize: 24,
  });
  // Neon frame lines along the back board's top edge.
  const bt0 = project(U0, V0, backH), bt1 = project(U1, V0, backH);
  const backFrame = `<line x1="${r1(bt0.x)}" y1="${r1(bt0.y)}" x2="${r1(bt1.x)}" y2="${r1(bt1.y)}" stroke="${t.edgeBack}" stroke-width="2" filter="url(#neon)"/>`;

  // Streak light-cycle over the bar tops.
  const days = data.weeks.flat();
  const run = longestRun(days);
  let trail = "";
  if (run.len >= 2) {
    const ptsList = ease(tops.slice(run.start, run.start + run.len)).map((p) => ({ x: p.x, y: p.y - 6 }));
    const d = smoothPath(ptsList);
    let L = 0;
    for (let i = 1; i < ptsList.length; i++) L += Math.hypot(ptsList[i].x - ptsList[i - 1].x, ptsList[i].y - ptsList[i - 1].y);
    L = Math.ceil(L) + 2;
    const end = ptsList[ptsList.length - 1];
    const cycle = 6;
    const draw = animate
      ? `<animate attributeName="stroke-dashoffset" values="${L};0;0;${-L}" keyTimes="0;0.55;0.8;1" dur="${cycle}s" repeatCount="indefinite"/>`
      : "";
    const head = animate
      ? `<circle r="4.5" fill="#ffffff" filter="url(#neon)"><animateMotion path="${d}" keyPoints="0;1;1;1" keyTimes="0;0.55;0.8;1" calcMode="linear" dur="${cycle}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;1;1;0" keyTimes="0;0.55;0.8;1" dur="${cycle}s" repeatCount="indefinite"/></circle>`
      : `<circle cx="${r1(end.x)}" cy="${r1(end.y)}" r="4.5" fill="#ffffff" filter="url(#neon)"/>`;
    const dash = animate ? ` stroke-dasharray="${L} ${L}" stroke-dashoffset="${L}"` : "";
    const tag = `${stats.longest}-DAY STREAK`;
    const tw = tag.length * 7.2 + 18;
    trail = `<g>
  <path d="${d}" fill="none" stroke="${t.streak}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".35" filter="url(#neon)"${dash}>${draw}</path>
  <path d="${d}" fill="none" stroke="${t.streak}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"${dash}>${draw}</path>
  <path d="${d}" fill="none" stroke="#ffffff" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"${dash}>${draw}</path>
  ${head}
  <g transform="translate(${r1(end.x)} ${r1(end.y - 26)})">
    <rect x="${r1(-tw / 2)}" y="-11" width="${r1(tw)}" height="20" rx="10" fill="${t.boardBg}" stroke="${t.streak}" stroke-width="1.4" filter="url(#neon)"/>
    <rect x="${r1(-tw / 2)}" y="-11" width="${r1(tw)}" height="20" rx="10" fill="${t.boardBg}"/>
    <text y="3.5" text-anchor="middle" font-family="ui-monospace, 'SF Mono', Menlo, Consolas, monospace" font-size="11" font-weight="800" letter-spacing="1.2" fill="${t.streak}">${esc(tag)}</text>
  </g>
</g>`;
  }

  const defs = `<pattern id="ledDots" width="3.4" height="3.4" patternUnits="userSpaceOnUse"><circle cx="1.7" cy="1.7" r="1.25" fill="#fff"/></pattern>
  <linearGradient id="ledGloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <filter id="ledBloom" x="-5%" y="-40%" width="110%" height="180%"><feGaussianBlur stdDeviation="2.2"/></filter>`;

  return { defs: defs + front.defs + back.defs, back: back.svg + backFrame, front: front.svg, trail };
}
