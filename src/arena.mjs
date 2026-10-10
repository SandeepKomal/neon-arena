// Neon Arena: the pieces that turn the 3D calendar into a lit stadium.
//
// - Front LED ticker: the slab's front face is a dot-matrix screen. Text is
//   drawn in the face's own plane through an affine matrix, so it sits on the
//   slab in true 3D, and scrolls the top repositories.
// - Streak light-cycle: a neon trail rides over the bar tops across the
//   longest streak, day by day, and ends in a tag.

import { adjust, mix } from "./neon.mjs";

const r1 = (n) => Math.round(n * 10) / 10;
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));

// Affine matrix for one short stretch of a face, from local x0..x0+len along
// direction (du, dv) and 0..height down it. In a parallel view one matrix maps
// a whole face; under perspective it can't, so faces are drawn as many short
// stretches.
function stretchMatrix(project, u, v, hTop, len, height, du = 1, dv = 0) {
  const o = project(u, v, hTop);
  const ex = project(u + du * len, v + dv * len, hTop);
  const ey = project(u, v, hTop - height);
  const m = [(ex.x - o.x) / len, (ex.y - o.y) / len, (ey.x - o.x) / height, (ey.y - o.y) / height, o.x, o.y];
  return `matrix(${m.map((n) => Math.round(n * 1e4) / 1e4).join(" ")})`;
}

// One scrolling LED board. `items` are [text, colour] pairs; the run repeats
// so the scroll loops seamlessly. The text is defined once and placed onto
// each face with <use>, so splitting the board costs almost nothing.
//
// With `lead`, the board is a ribbon that wraps round the box's left corner:
// it starts `lead` units back along the left end face, turns the corner and
// runs along the front, and the text scrolls round the corner without a break.
// The bezel then frames only the ribbon's two outer ends.
function ledBoard({ id, project, u0, length, v, hTop, height, items, t, animate, speed, direction, fontSize, padX = 12, padY = 6, lead = 0 }) {
  const total = lead + length;
  const charW = fontSize * 0.62 + 2;
  const run = items.map(([s]) => s).join("").length;
  const runW = run * charW;
  const copies = Math.ceil(total / runW) + 2;
  const tspans = Array.from({ length: copies }, () =>
    items.map(([s, c]) => `<tspan fill="${mix(c, "#ffffff", 0.18)}">${esc(s)}</tspan>`).join("")
  ).join("");
  const baseline = r1(height / 2 + fontSize * 0.36);
  const dur = r1(runW / speed);
  const from = direction < 0 ? 0 : -runW;
  const to = direction < 0 ? -runW : 0;
  const scroll = animate
    ? `<animateTransform attributeName="transform" type="translate" values="${r1(from)} 0;${r1(to)} 0" dur="${dur}s" repeatCount="indefinite"/>`
    : "";
  const text = `<text y="${baseline}" font-family="ui-monospace, 'SF Mono', Menlo, Consolas, monospace" font-size="${fontSize}" font-weight="800" letter-spacing="2">${tspans}</text>`;
  // Crisp solid letters with a soft bloom behind them, so names stay readable
  // at the size GitHub shows the image. The LED texture is a grid of dark gaps
  // laid over the screen rather than a dot mask that breaks the letters up.
  const defs = `<g id="${id}Text"><g>${scroll}<g filter="url(#ledBloom)" opacity=".55">${text}</g>${text}</g></g>`;

  // Faces along the ribbon, in ribbon coordinates (x from 0 to total).
  const faces = [{ u: u0, v, du: 1, dv: 0, len: length, x0: lead }];
  if (lead > 0) faces.unshift({ u: u0, v: v - lead, du: 0, dv: 1, len: lead, x0: 0 });
  const screenFrom = padX, screenTo = total - padX;

  let panels = "", stretches = "", gloss = "";
  faces.forEach((f, n) => {
    const at = (x, down) => project(f.u + f.du * x, f.v + f.dv * x, hTop - down);
    const quad = (a, b, top, bottom) => [at(a, top), at(b, top), at(b, bottom), at(a, bottom)].map((q) => `${r1(q.x)},${r1(q.y)}`).join(" ");
    const a = Math.max(0, screenFrom - f.x0), b = Math.min(f.len, screenTo - f.x0);
    panels += `<polygon points="${quad(0, f.len, 0, height)}" fill="${adjust(t.boardBg, 1.16)}"/>` +
      `<polygon points="${quad(a, b, padY, height - padY)}" fill="${t.boardBg}"/>`;
    gloss += `<polygon points="${quad(0, f.len, 0, height)}" fill="url(#ledGloss)"/>`;
    const parts = project.perspective ? 16 : 1, seg = f.len / parts;
    for (let k = 0; k < parts; k++) {
      const s0 = k * seg;
      const lo0 = Math.max(s0, a), hi0 = Math.min(s0 + seg, b);
      if (hi0 <= lo0) continue;
      // Neighbouring stretches and faces overlap a hair so no seam shows.
      const lo = f.x0 + lo0 - (lo0 > a || f.x0 > 0 ? 0.4 : 0), hi = f.x0 + hi0 + (hi0 < b || n < faces.length - 1 ? 0.4 : 0);
      const clip = `x="${r1(lo)}" y="${r1(padY)}" width="${r1(hi - lo)}" height="${r1(height - 2 * padY)}"`;
      const cid = `${id}C${n}_${k}`;
      stretches += `<clipPath id="${cid}"><rect ${clip}/></clipPath>` +
        `<g transform="${stretchMatrix(project, f.u + f.du * s0, f.v + f.dv * s0, hTop, seg, height, f.du, f.dv)} translate(${r1(-(f.x0 + s0))} 0)" clip-path="url(#${cid})"><use href="#${id}Text"/><rect ${clip} fill="url(#ledGrid)"/></g>`;
    }
  });
  return { defs, svg: panels + stretches + gloss };
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
        [" ◆ ", t.boardMute],
        [r.name, t.accents[i % t.accents.length]],
        [r.stars ? ` ★${r.stars}` : "", t.boardInk],
      ])
    : [[" ◆ NEON ARENA ", t.boardInk]];
  const front = ledBoard({
    id: "ledFront", project, u0: U0, length, v: V1, hTop: 0, height: depth,
    lead: !project.perspective && project.faceVisible(-1, 0, U0, V0) ? V1 - V0 : 0,
    items: [[" TOP REPOS", t.boardInk], ...frontItems], t, animate, speed: 46, direction: -1, fontSize: 26,
  });

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

  const defs = `<pattern id="ledGrid" width="3.4" height="3.4" patternUnits="userSpaceOnUse"><path d="M0 .3H3.4M.3 0V3.4" stroke="${t.boardBg}" stroke-width=".7" stroke-opacity=".5"/></pattern>
  <linearGradient id="ledGloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <filter id="ledBloom" x="-5%" y="-40%" width="110%" height="180%"><feGaussianBlur stdDeviation="1.5"/></filter>`;

  return { defs: defs + front.defs, front: front.svg, trail };
}
