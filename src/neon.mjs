// Colour helpers and neon-tube edges shared by the slab and the LED boards.

const r1 = (n) => Math.round(n * 10) / 10;

// Lighten (k > 1, toward white) or darken (k < 1) a #rrggbb colour.
export function adjust(hex, k) {
  const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const out = ch.map((v) => (k >= 1 ? v + (255 - v) * (k - 1) : v * k));
  return "#" + out.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

// Linear blend between two #rrggbb colours.
export function mix(a, b, k) {
  const ca = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const cb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + ca.map((v, i) => Math.round(v + (cb[i] - v) * k).toString(16).padStart(2, "0")).join("");
}

// One neon tube between two projected points: a coloured core, which the
// caller glows, and a bright centre line. When the two ends have different
// colours the tube fades from one to the other, so edges that run from the
// back of a box to its front join both colours seamlessly at the corners.
function tube(p, q, ca, cb, id) {
  const line = `x1="${r1(p.x)}" y1="${r1(p.y)}" x2="${r1(q.x)}" y2="${r1(q.y)}"`;
  const caps = `stroke-linecap="round"`;
  const white = (c) => mix(c, "#ffffff", 0.55);
  if (ca === cb) {
    return {
      defs: "",
      core: `<line ${line} stroke="${ca}" stroke-width="2.6" ${caps}/>`,
      centre: `<line ${line} stroke="${white(ca)}" stroke-width="0.9" ${caps}/>`,
    };
  }
  const grad = (gid, a, b) =>
    `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" ${line}><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  return {
    defs: grad(id, ca, cb) + grad(`${id}w`, white(ca), white(cb)),
    core: `<line ${line} stroke="url(#${id})" stroke-width="2.6" ${caps}/>`,
    centre: `<line ${line} stroke="url(#${id}w)" stroke-width="0.9" ${caps}/>`,
  };
}

// Tubes along a set of box edges. `colourAt(point)` picks the colour at a
// world position, so each end of an edge takes the colour of where it sits.
// The glow is one filter over the whole group: a filter on a single
// near-vertical line would be clipped to its hairline bounding box.
export function tubes(edges, colourAt, idPrefix) {
  const parts = edges.map((e, i) => tube(e.p, e.q, colourAt(e.a), colourAt(e.b), `${idPrefix}${i}`));
  return parts.map((t) => t.defs).join("") +
    `<g filter="url(#neon)">${parts.map((t) => t.core).join("")}</g>` +
    parts.map((t) => t.centre).join("");
}
