import { computeStats, levelByRank } from "./stats.mjs";
import { makeProjector, prismFaces, boxFaces, boxEdges } from "./geometry.mjs";
import { adjust, mix, tubes } from "./neon.mjs";
import { themes, FONT_STACK } from "./themes.mjs";
import { arena } from "./arena.mjs";

// The terrain is the hero: it runs corner to corner, rising from bottom-left
// to top-right, and the cards sit in the two empty corners it leaves.
const W = 1280;
const H = 760;
const CX = 640;
const CY = 452;
const CELL = 22;
const GAP = 3.4;
const YAW = -24;
const PITCH = 50;
const CAMERA = 3000; // camera distance: real perspective, but long enough that tall bars stay upright
const LENS_SHIFT = -280; // camera slid left, so the slab's left end shows as a solid face
const PLATE_PAD = 14;
const PLATE_DEPTH = 40; // world units below the ground plane; the front face is the LED ticker
const MAX_BAR = 290; // world height of the busiest day

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
const r1 = (n) => Math.round(n * 10) / 10;

// Colour of the floor band at position f (0..1) through the year.
function floorAt(stops, f) {
  const x = Math.max(0, Math.min(1, f)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  return mix(stops[i], stops[i + 1], x - i);
}

const pts = (list) => list.map((p) => `${r1(p.x)},${r1(p.y)}`).join(" ");
const poly = (list, fill, extra = "") => `<polygon points="${pts(list)}" fill="${fill}"${extra}/>`;

// "2026-06-03" -> "Jun 3"
function shortDate(iso) {
  const [, m, d] = String(iso).split("-").map(Number);
  return m >= 1 && m <= 12 && d ? `${MONTHS[m - 1]} ${d}` : esc(iso);
}

function lcg(seed) {
  return () => {
    seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

function stars(animate) {
  const rand = lcg(99);
  let out = "";
  for (let i = 0; i < 150; i++) {
    const big = rand() < 0.08;
    const x = r1(rand() * W);
    const y = r1(rand() * H);
    const o = r1(0.12 + rand() * 0.45);
    if (big && animate) {
      const dur = r1(3 + rand() * 4);
      out += `<circle cx="${x}" cy="${y}" r="1.4" fill="#fff" opacity="${o}"><animate attributeName="opacity" values="${o};.9;${o}" dur="${dur}s" begin="${r1(-rand() * dur)}s" repeatCount="indefinite"/></circle>`;
    } else {
      out += `<circle cx="${x}" cy="${y}" r="${big ? 1.4 : 0.7}" fill="#fff" opacity="${o}"/>`;
    }
  }
  return out;
}

// Soft colour clouds behind the scene so the backdrop has depth instead of a flat fill.
function nebula() {
  return `<ellipse cx="${W * 0.8}" cy="${H * 0.2}" rx="420" ry="220" fill="url(#nebA)"/><ellipse cx="${W * 0.28}" cy="${H * 0.82}" rx="460" ry="200" fill="url(#nebB)"/>`;
}

// A ground-plane grid around the plate, faded out radially by a mask.
function floorGrid(data, project, t) {
  const halfU = (data.weeks.length * CELL) / 2 + 260;
  const halfV = (7 * CELL) / 2 + 300;
  const step = CELL * 2;
  const h = -PLATE_DEPTH;
  let lines = "";
  for (let u = -Math.floor(halfU / step) * step; u <= halfU; u += step) {
    const a = project(u, -halfV, h), b = project(u, halfV, h);
    lines += `M${r1(a.x)},${r1(a.y)}L${r1(b.x)},${r1(b.y)}`;
  }
  for (let v = -Math.floor(halfV / step) * step; v <= halfV; v += step) {
    const a = project(-halfU, v, h), b = project(halfU, v, h);
    lines += `M${r1(a.x)},${r1(a.y)}L${r1(b.x)},${r1(b.y)}`;
  }
  return `<path d="${lines}" fill="none" stroke="${t.grid}" stroke-width=".6" opacity="${t.dark ? ".55" : ".5"}" mask="url(#gridMask)"/>`;
}

// Colour levels follow the spread of active days (quartiles), so one huge day
// does not flatten every other day into the lowest colour.
function rankThresholds(weeks) {
  const counts = weeks.flat().map((d) => d.count).filter((c) => c > 0).sort((a, b) => a - b);
  const at = (q) => counts[Math.min(counts.length - 1, Math.floor(q * counts.length))] ?? 0;
  return [at(0.25), at(0.5), at(0.75)];
}

function terrain(data, stats, t, project, animate) {
  const weekCount = data.weeks.length;
  const u0 = (-weekCount * CELL) / 2;
  const v0 = (-7 * CELL) / 2;

  const cells = [];
  data.weeks.forEach((week, i) =>
    week.forEach((day, j) => {
      const u = u0 + i * CELL + GAP / 2;
      const v = v0 + j * CELL + GAP / 2;
      cells.push({ u, v, day, week: i, row: j, depth: project(u, v, 0).depth });
    })
  );
  cells.sort((a, b) => a.depth - b.depth);

  const size = CELL - GAP;
  const thresholds = rankThresholds(data.weeks);
  const heightOf = (count) => 6 + Math.pow(count / stats.max, 0.6) * MAX_BAR;
  let floor = "";
  let svg = "";
  let ao = "";
  // Gradient materials, created once per colour and shade, so faces are lit
  // rather than flat-filled.
  const mats = new Map();
  const material = (kind, color, shade) => {
    const id = `m${kind}${color.slice(1)}${Math.round(shade * 100)}`;
    if (!mats.has(id)) {
      mats.set(id, kind === "side"
        // Sides: brighter at the top, falling off toward the base.
        ? `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${adjust(color, shade * 1.12)}"/><stop offset="1" stop-color="${adjust(color, shade * (t.dark ? 0.55 : 0.72))}"/></linearGradient>`
        // Tops: a soft specular sheen from the back-left light.
        : `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${adjust(color, 1.32)}"/><stop offset=".55" stop-color="${adjust(color, 1.12)}"/><stop offset="1" stop-color="${adjust(color, 0.96)}"/></linearGradient>`);
    }
    return `url(#${id})`;
  };
  const TILE_H = 3.2;
  const tops = new Array(weekCount * 7);
  let peakTop = null;
  const jitter = lcg(7);
  for (const { u, v, day, week, row } of cells) {
    const isPeak = stats.peak.date === day.date && day.count > 0;
    const base = isPeak ? t.peak : t.ramp[levelByRank(day.count, thresholds)];
    if (day.count === 0) tops[week * 7 + row] = project(u + size / 2, v + size / 2, 0);
    if (day.count === 0) {
      // Empty days take the floor band, with a little per-cell variation for texture.
      const band = floorAt(t.floor, (week + row / 7) / Math.max(1, weekCount - 1));
      // Raised tile: a low prism, so every empty day reads as a physical key
      // set into the slab rather than a painted square.
      const tile = t.dark ? adjust(band, 0.9 + jitter() * 0.2) : band;
      const tf = prismFaces(project, u, v, size, TILE_H);
      const skirt = tf.filter((f) => !f.top).map((f) => "M" + f.pts.map((q) => `${r1(q.x)},${r1(q.y)}`).join("L") + "Z").join("");
      floor += `<path d="${skirt}" fill="${adjust(tile, t.dark ? 0.55 : 0.8)}"/>` +
        poly(tf.find((f) => f.top).pts, tile, ` stroke="${t.cellEdge}" stroke-width="${t.dark ? ".6" : "1"}" stroke-opacity="${t.dark ? ".75" : "1"}"`);
      continue;
    }
    const height = heightOf(day.count);
    const faces = prismFaces(project, u, v, size, height);
    for (const face of faces) {
      const edge = !face.top
        ? ""
        : t.neonEdges
          ? ` stroke="${t.dark ? mix(base, "#ffffff", 0.45) : adjust(base, 0.82)}" stroke-width="1" stroke-opacity=".95"`
          : ` stroke="${t.cellEdge}" stroke-width=".6" stroke-opacity=".62"`;
      const glow = face.top && isPeak ? ` filter="url(#glow)"` : "";
      svg += poly(face.pts, face.top ? material("top", base, 1) : material("side", base, face.shade), `${edge}${glow}`);
    }
    // Contact shadow: a soft dark footprint, nudged away from the light.
    const sh = 2.5;
    ao += poly([project(u - sh, v + 1), project(u + size + sh * 2, v + 1), project(u + size + sh * 2, v + size + sh * 2), project(u - sh, v + size + sh * 2)], t.shadow);
    tops[week * 7 + row] = project(u + size / 2, v + size / 2, height);
    if (isPeak) peakTop = project(u + size / 2, v + size / 2, height);
  }

  // The plate is a slab under the calendar; only faces turned toward the viewer are drawn.
  const U0 = u0 - PLATE_PAD, U1 = -u0 + PLATE_PAD, V0 = v0 - PLATE_PAD, V1 = -v0 + PLATE_PAD;
  const corner = (u, v, h = 0) => project(u, v, h);
  const top = [corner(U0, V0), corner(U1, V0), corner(U1, V1), corner(U0, V1)];
  const bottom = [corner(U0, V0, -PLATE_DEPTH), corner(U1, V0, -PLATE_DEPTH), corner(U1, V1, -PLATE_DEPTH), corner(U0, V1, -PLATE_DEPTH)];
  // The slab is a solid box in a dark casing, the same material as the LED
  // screen on its front, so the screen and the end caps read as one block.
  const slab = { u0: U0, u1: U1, v0: V0, v1: V1, h0: -PLATE_DEPTH, h1: 0 };
  const sides = boxFaces(project, slab)
    .filter((f) => f.key !== "top")
    .map((f) => {
      const id = `slab${f.key}`;
      const lit = f.n[1] ? 1 : 0.75;
      const y0 = Math.min(f.pts[0].y, f.pts[1].y), y1 = Math.max(f.pts[2].y, f.pts[3].y);
      return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${r1(y0)}" x2="0" y2="${r1(y1)}"><stop offset="0" stop-color="${adjust(t.boardBg, 1 + 0.16 * lit)}"/><stop offset="1" stop-color="${adjust(t.boardBg, 0.8)}"/></linearGradient>` +
        poly(f.pts, `url(#${id})`) + poly(f.pts, "url(#ledGloss)");
    })
    .join("");

  const shadow = `<polygon points="${pts(bottom.map((p) => ({ x: p.x + 6, y: p.y + 22 })))}" fill="${t.shadow}" opacity="${t.dark ? ".75" : ".2"}" filter="url(#soft)"/>`;
  // Every visible edge of the slab is a neon tube: pink along the back, green
  // along the front, and the edges that run front to back fade from one to
  // the other, so all the tubes meet cleanly at the corners.
  const rim = tubes(boxEdges(project, slab), (p) => (p.v <= V0 ? t.edgeBack : t.edgeFront), "slabEdge");
  const plate =
    shadow +
    sides +
    `<polygon points="${pts(top)}" fill="url(#plateFill)" stroke="${t.plateEdge}" stroke-width="1"/>` ;

  // Month ticks along the front edge, below the slab.
  let months = "";
  let prev = -1;
  data.weeks.forEach((week, i) => {
    const m = Number(String(week[0]?.date || "").slice(5, 7));
    if (!m || m === prev) return;
    const first = prev === -1;
    prev = m;
    if (first && Number(String(week[0].date).slice(8, 10)) > 14) return; // partial leading month
    const a = project(u0 + i * CELL, V1, -PLATE_DEPTH);
    months += `<line x1="${r1(a.x)}" y1="${r1(a.y + 4)}" x2="${r1(a.x)}" y2="${r1(a.y + 10)}" stroke="${t.mute}" stroke-opacity=".6"/><text x="${r1(a.x)}" y="${r1(a.y + 24)}" text-anchor="middle" font-size="12" letter-spacing=".4" fill="${t.mute}">${MONTHS[m - 1]}</text>`;
  });

  // A colour wave rolls across the year: one soft strip per week fades in and
  // out in turn, between the floor and the bars, so bars stay solid in front.
  // Each pass takes the next colour in the theme's wave palette.
  let wave = "";
  if (animate && t.wave) {
    const period = 7;
    const travel = 4;
    data.weeks.forEach((_, i) => {
      const a = u0 + i * CELL, b = a + CELL;
      const begin = r1((i / weekCount) * travel);
      wave += `<polygon points="${pts([project(a, v0), project(b, v0), project(b, -v0), project(a, -v0)])}" fill="${t.wave[0]}" opacity="0">` +
        `<animate attributeName="opacity" values="0;${t.waveOpacity};0;0" keyTimes="0;0.07;0.2;1" dur="${period}s" begin="${begin}s" repeatCount="indefinite"/>` +
        `<animate attributeName="fill" values="${t.wave.join(";")}" calcMode="discrete" dur="${period * t.wave.length}s" begin="${begin}s" repeatCount="indefinite"/>` +
        `</polygon>`;
    });
  }

  const aoLayer = `<g filter="url(#aoBlur)" opacity="${t.dark ? ".55" : ".22"}">${ao}</g>`;
  return { plate, mats: [...mats.values()].join(""), bars: floor + wave + aoLayer + svg, months, peakTop, rim, geo: { U0, U1, V0, V1, depth: PLATE_DEPTH }, tops: tops.filter(Boolean) };
}

// A light beam rising from the busiest day, with a callout at its tip.
function beacon(peakTop, stats, t) {
  if (!peakTop) return "";
  const x = r1(peakTop.x), y0 = r1(peakTop.y - 2), y1 = r1(Math.max(44, peakTop.y - 64));
  const label = `${shortDate(stats.peak.date)} · ${stats.max}`;
  const w = 26 + label.length * 6.4;
  return `<g>
  <linearGradient id="beam" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${y1}"><stop offset="0" stop-color="${t.peak}" stop-opacity=".95"/><stop offset="1" stop-color="${t.peak}" stop-opacity="0"/></linearGradient>
  <line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" stroke="url(#beam)" stroke-width="7" opacity=".25"/>
  <line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" stroke="url(#beam)" stroke-width="1.5"/>
  <rect x="${r1(x - 11)}" y="${r1(y1 - 22)}" width="${r1(w)}" height="20" rx="10" fill="${t.bgOuter}" fill-opacity=".72" stroke="${t.peak}" stroke-opacity=".55"/>
  <circle cx="${x}" cy="${r1(y1 - 12)}" r="3" fill="${t.peak}"/>
  <text x="${r1(x + 8)}" y="${r1(y1 - 8)}" font-size="11" font-weight="600" fill="${t.ink}">${esc(label)}</text>
</g>`;
}

// Top-left card: identity, four headline numbers in a row, and a sparkline.
function panel(data, stats, t) {
  const x = 40, y = 36, w = 440, h = 236;
  const col = (w - 56) / 4;
  const stat = (i, value, label) =>
    `<text x="${r1(x + 28 + i * col)}" y="${y + 138}" font-size="26" font-weight="700" letter-spacing="-0.5" fill="${t.ink}">${esc(value)}</text>` +
    `<text x="${r1(x + 28 + i * col)}" y="${y + 156}" font-size="11.5" fill="${t.mute}">${esc(label)}</text>`;

  const series = stats.weekly.slice(-26);
  const top = Math.max(1, ...series);
  const sx0 = x + 28, sw = w - 56, sy0 = y + h - 18, sh = 30;
  const step = sw / Math.max(1, series.length - 1);
  const line = series.map((v, i) => `${r1(sx0 + i * step)},${r1(sy0 - (v / top) * sh)}`);
  const area = `${sx0},${sy0} ${line.join(" ")} ${r1(sx0 + sw)},${sy0}`;
  const last = line[line.length - 1] || `${sx0},${sy0}`;
  const [lx, ly] = last.split(",");

  return `<g>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="url(#glassFill)" stroke="url(#glassEdge)" stroke-width="${t.neonFrame ? 2 : 1}"${t.neonFrame ? ` filter="url(#neon)"` : ""}/>
  <rect x="${x + 28}" y="${y + 26}" width="18" height="3" rx="1.5" fill="${t.glow}"/>
  <text x="${x + 52}" y="${y + 31}" font-size="9.5" font-weight="700" letter-spacing="1.6" fill="${t.glow}">NEON ARENA · CONTRIBUTIONS</text>
  <text x="${x + w - 28}" y="${y + 31}" text-anchor="end" font-size="10.5" fill="${t.mute}" opacity=".8">Updated ${esc(data.generatedAt)}</text>
  <text x="${x + 28}" y="${y + 62}" font-size="24" font-weight="700" letter-spacing="-0.3" fill="${t.ink}">${esc(data.name)}</text>
  <text x="${x + 28}" y="${y + 82}" font-size="13" fill="${t.mute}">@${esc(data.login)} · last 12 months</text>
  <line x1="${x + 28}" x2="${x + w - 28}" y1="${y + 100}" y2="${y + 100}" stroke="${t.rule}"/>
  ${stat(0, stats.total.toLocaleString("en-US"), "contributions")}
  ${stat(1, `${stats.activeDays}`, "active days")}
  ${stat(2, `${stats.current} d`, "current streak")}
  ${stat(3, `${stats.longest} d`, "longest streak")}
  <text x="${x + 28}" y="${y + 184}" font-size="11" fill="${t.mute}">Weekly activity · last 26 weeks</text>
  <polygon points="${area}" fill="url(#sparkFill)"/>
  <polyline points="${line.join(" ")}" fill="none" stroke="${t.glow}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="${lx}" cy="${ly}" r="3.2" fill="${t.glow}" stroke="${t.bgOuter}" stroke-width="1.5"/>
</g>`;
}

// Bottom-right card: the intensity ramp drawn as tiny prisms that echo the terrain, and the peak day.
function legend(stats, t) {
  const w = 340, h = 128, x = W - 40 - w, y = H - 28 - h;
  let ramp = "";
  t.ramp.forEach((color, i) => {
    const p = makeProjector({ yawDeg: YAW, pitchDeg: PITCH, cx: x + 42 + i * 26, cy: y + 72 });
    const size = 12;
    if (i === 0) {
      ramp += poly([p(-size / 2, -size / 2), p(size / 2, -size / 2), p(size / 2, size / 2), p(-size / 2, size / 2)], color, ` stroke="${t.cellEdge}" stroke-width="${t.dark ? ".6" : "1.2"}"`);
      return;
    }
    for (const face of prismFaces(p, -size / 2, -size / 2, size, i * 9)) {
      ramp += poly(face.pts, adjust(color, face.shade), face.top ? ` stroke="${t.cellEdge}" stroke-width=".45" stroke-opacity=".62"` : "");
    }
  });

  const px = x + 196;
  const peak = stats.peak.date
    ? `<text x="${px}" y="${y + 70}" font-size="20" font-weight="700" fill="${t.ink}">${esc(shortDate(stats.peak.date))}</text>
  <text x="${px}" y="${y + 88}" font-size="11" fill="${t.mute}">${stats.max} contributions</text>`
    : `<text x="${px}" y="${y + 70}" font-size="12" fill="${t.mute}">No activity yet</text>`;

  return `<g>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="url(#glassFill)" stroke="url(#glassEdge)" stroke-width="${t.neonFrame ? 2 : 1}"${t.neonFrame ? ` filter="url(#neon)"` : ""}/>
  <text x="${x + 28}" y="${y + 28}" font-size="11" fill="${t.mute}">Daily intensity</text>
  ${ramp}
  <text x="${x + 28}" y="${y + 96}" font-size="10" fill="${t.mute}" opacity=".8">less</text>
  <text x="${x + 162}" y="${y + 96}" font-size="10" fill="${t.mute}" opacity=".8" text-anchor="end">more</text>
  <line x1="${x + 178}" x2="${x + 178}" y1="${y + 18}" y2="${y + 96}" stroke="${t.rule}"/>
  <circle cx="${px + 4}" cy="${y + 24}" r="4" fill="${t.peak}" filter="url(#glow)"/>
  <text x="${px + 14}" y="${y + 28}" font-size="11" fill="${t.mute}">Peak day</text>
  ${peak}
  <text x="${x + 28}" y="${y + h - 12}" font-size="10" fill="${t.mute}" opacity=".8">Ticker: top repos · Light trail: longest streak</text>
</g>`;
}

export function renderSvg(data, { theme = "aurora", animate = true } = {}) {
  const t = themes[theme];
  if (!t) throw new Error(`Unknown theme "${theme}". Available: ${Object.keys(themes).join(", ")}`);

  const stats = computeStats(data.weeks);
  const project = makeProjector({ yawDeg: YAW, pitchDeg: PITCH, cx: CX + 22, cy: CY - 18, distance: CAMERA, zoom: 0.9, shift: LENS_SHIFT });
  const { plate, rim, bars, months, peakTop, geo, tops, mats } = terrain(data, stats, t, project, animate);
  const stage = arena({ data, stats, t, project, animate, geo, tops });
  const label = `${data.name}: ${stats.total} contributions, longest streak ${stats.longest} days`;
  const desc =
    `3D contribution terrain for @${data.login}: ${stats.total} contributions over ${stats.activeDays} active days, ` +
    `current streak ${stats.current} days, longest streak ${stats.longest} days` +
    (stats.peak.date ? `, busiest day ${stats.peak.date} with ${stats.max} contributions.` : ".");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}" font-family="${FONT_STACK}" text-rendering="geometricPrecision">
<title>${esc(label)}</title>
<desc>${esc(desc)}</desc>
<defs>
  <radialGradient id="bg" cx="62%" cy="58%" r="85%"><stop offset="0" stop-color="${t.bgInner}"/><stop offset=".55" stop-color="${t.bgMid}"/><stop offset="1" stop-color="${t.bgOuter}"/></radialGradient>
  <radialGradient id="nebA"><stop offset="0" stop-color="${t.nebulaA}" stop-opacity="${t.dark ? 0.28 : 0.6}"/><stop offset="1" stop-color="${t.nebulaA}" stop-opacity="0"/></radialGradient>
  <radialGradient id="nebB"><stop offset="0" stop-color="${t.nebulaB}" stop-opacity="${t.dark ? 0.22 : 0.55}"/><stop offset="1" stop-color="${t.nebulaB}" stop-opacity="0"/></radialGradient>
  <radialGradient id="gridFade" cx="50%" cy="58%" r="52%"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <mask id="gridMask"><rect width="${W}" height="${H}" fill="url(#gridFade)"/></mask>
  <linearGradient id="glassFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${t.dark ? 0.09 : 1}"/><stop offset="1" stop-color="#fff" stop-opacity="${t.dark ? 0.03 : 0.97}"/></linearGradient>
  <linearGradient id="glassEdge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.borderA}" stop-opacity="${t.dark ? 0.35 : 0.9}"/><stop offset="1" stop-color="${t.borderB}" stop-opacity="${t.dark ? 0.35 : 0.9}"/></linearGradient>
  <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.glow}" stop-opacity=".35"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></linearGradient>
  <linearGradient id="plateFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.dark ? adjust(t.plateTop, 0.85) : t.plateTop}"/><stop offset="1" stop-color="${t.dark ? adjust(t.plateTop, 1.08) : t.plateTop}"/></linearGradient>
  ${stage.defs}
  ${mats}
  <filter id="aoBlur" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="2.4"/></filter>
  <radialGradient id="floorGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${t.glow}" stop-opacity="${t.dark ? 0.25 : 0.06}"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient>
  <filter id="neon" x="-10%" y="-10%" width="120%" height="120%" filterUnits="objectBoundingBox"><feGaussianBlur in="SourceGraphic" stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="soft" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="12"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
${nebula()}
${t.stars ? stars(animate) : ""}
${floorGrid(data, project, t)}
<ellipse cx="${CX}" cy="${CY}" rx="660" ry="280" fill="url(#floorGlow)"/>
${plate}
${stage.front}
${rim}
${stage.back}
${bars}
${stage.trail}
${months}
${beacon(peakTop, stats, t)}
${panel(data, stats, t)}
${legend(stats, t)}
</svg>
`;
}
