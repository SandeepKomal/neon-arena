// Tiny 3D helper: rotate around the vertical axis, tilt toward the viewer,
// and project to 2D. World axes: u (east), v (south), h (up).

// With `distance`, the camera sits that far from the scene centre and points
// shrink with distance (perspective). Without it the view is orthographic.
// `shift` slides the camera sideways (in screen x, world units) while the
// image stays centred, like a shift lens: a camera off to the left sees the
// left end of the scene as well as its front.
export function makeProjector({ yawDeg, pitchDeg, cx, cy, distance = 0, zoom = 1, shift = 0 }) {
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const sinPitch = Math.sin(pitch);
  const cosPitch = Math.cos(pitch);

  const project = (u, v, h = 0) => {
    const x = u * cosYaw - v * sinYaw;
    const depth = u * sinYaw + v * cosYaw; // larger = closer to the viewer
    const y = depth * sinPitch - h * cosPitch;
    const s = (distance ? distance / (distance - (depth * cosPitch + h * sinPitch)) : 1) * zoom;
    return { x: cx + (x - shift) * s + shift * zoom, y: cy + y * s, depth };
  };

  // How much a ground-plane direction (nu, nv) faces the viewer (>0 = visible).
  project.facing = (nu, nv) => nu * sinYaw + nv * cosYaw;

  // Whether a vertical face with outward normal (nu, nv), passing through the
  // ground point (pu, pv), points toward the camera. Exact under perspective,
  // where it depends on where the face sits in the scene.
  const cam = distance
    ? { u: distance * cosPitch * sinYaw + shift * cosYaw, v: distance * cosPitch * cosYaw - shift * sinYaw }
    : null;
  project.faceVisible = (nu, nv, pu, pv) =>
    cam ? nu * (cam.u - pu) + nv * (cam.v - pv) > 0 : project.facing(nu, nv) > 0;
  // Whether a horizontal face at height h is seen from above (nh = 1) or
  // from below (nh = -1).
  const camH = distance ? distance * sinPitch : Infinity;
  project.capVisible = (nh, h) => (nh > 0 ? camH > h : camH < h);
  project.perspective = Boolean(distance);
  return project;
}

const LIGHT = (() => {
  const l = [-0.45, 0.9];
  const len = Math.hypot(l[0], l[1]);
  return [l[0] / len, l[1] / len];
})();

// Returns the visible faces of an axis-aligned prism, each with a brightness
// multiplier derived from a fixed light direction.
export function prismFaces(project, u, v, size, height) {
  const u1 = u + size;
  const v1 = v + size;
  const P = (a, b, h) => project(a, b, h);
  const sides = [
    { n: [0, 1], pts: [P(u, v1, 0), P(u1, v1, 0), P(u1, v1, height), P(u, v1, height)] },
    { n: [1, 0], pts: [P(u1, v, 0), P(u1, v1, 0), P(u1, v1, height), P(u1, v, height)] },
    { n: [-1, 0], pts: [P(u, v, 0), P(u, v1, 0), P(u, v1, height), P(u, v, height)] },
    { n: [0, -1], pts: [P(u, v, 0), P(u1, v, 0), P(u1, v, height), P(u, v, height)] },
  ];

  const faces = [];
  for (const side of sides) {
    if (!project.faceVisible(side.n[0], side.n[1], side.n[0] > 0 ? u1 : u, side.n[1] > 0 ? v1 : v)) continue;
    const lit = Math.max(0, side.n[0] * LIGHT[0] + side.n[1] * LIGHT[1]);
    faces.push({ pts: side.pts, shade: 0.42 + 0.45 * lit });
  }
  faces.push({ pts: [P(u, v, height), P(u1, v, height), P(u1, v1, height), P(u, v1, height)], shade: 1.16, top: true });
  return faces;
}

// The visible faces and edges of an axis-aligned box, so solid objects can be
// drawn with every visible edge outlined and joined at the corners.
// Box: { u0, u1, v0, v1, h0, h1 }.
const SIDES = [
  { n: [0, 1], key: "front" },
  { n: [1, 0], key: "right" },
  { n: [-1, 0], key: "left" },
  { n: [0, -1], key: "back" },
];

function faceShown(project, b, key) {
  switch (key) {
    case "top": return project.capVisible(1, b.h1);
    case "bottom": return project.capVisible(-1, b.h0);
    case "front": return project.faceVisible(0, 1, b.u0, b.v1);
    case "back": return project.faceVisible(0, -1, b.u0, b.v0);
    case "right": return project.faceVisible(1, 0, b.u1, b.v0);
    case "left": return project.faceVisible(-1, 0, b.u0, b.v0);
  }
}

export function boxFaces(project, b) {
  const P = (u, v, h) => ({ u, v, h, ...project(u, v, h) });
  const quads = {
    front: [P(b.u0, b.v1, b.h1), P(b.u1, b.v1, b.h1), P(b.u1, b.v1, b.h0), P(b.u0, b.v1, b.h0)],
    back: [P(b.u1, b.v0, b.h1), P(b.u0, b.v0, b.h1), P(b.u0, b.v0, b.h0), P(b.u1, b.v0, b.h0)],
    right: [P(b.u1, b.v1, b.h1), P(b.u1, b.v0, b.h1), P(b.u1, b.v0, b.h0), P(b.u1, b.v1, b.h0)],
    left: [P(b.u0, b.v0, b.h1), P(b.u0, b.v1, b.h1), P(b.u0, b.v1, b.h0), P(b.u0, b.v0, b.h0)],
    top: [P(b.u0, b.v0, b.h1), P(b.u1, b.v0, b.h1), P(b.u1, b.v1, b.h1), P(b.u0, b.v1, b.h1)],
  };
  const out = SIDES.filter((s) => faceShown(project, b, s.key)).map((s) => ({ key: s.key, n: s.n, pts: quads[s.key] }));
  if (faceShown(project, b, "top")) out.push({ key: "top", n: [0, 0], pts: quads.top });
  return out;
}

// Each of the 12 edges is shown when either face it borders is shown.
export function boxEdges(project, b) {
  const U = [b.u0, b.u1], V = [b.v0, b.v1], Hh = [b.h0, b.h1];
  const uFace = (i) => (i ? "right" : "left");
  const vFace = (i) => (i ? "front" : "back");
  const hFace = (i) => (i ? "top" : "bottom");
  const edges = [];
  const add = (a, z, f1, f2) => {
    if (!faceShown(project, b, f1) && !faceShown(project, b, f2)) return;
    edges.push({ a, b: z, p: project(a.u, a.v, a.h), q: project(z.u, z.v, z.h), faces: [f1, f2] });
  };
  for (const iv of [0, 1]) for (const ih of [0, 1])
    add({ u: U[0], v: V[iv], h: Hh[ih] }, { u: U[1], v: V[iv], h: Hh[ih] }, vFace(iv), hFace(ih));
  for (const iu of [0, 1]) for (const ih of [0, 1])
    add({ u: U[iu], v: V[0], h: Hh[ih] }, { u: U[iu], v: V[1], h: Hh[ih] }, uFace(iu), hFace(ih));
  for (const iu of [0, 1]) for (const iv of [0, 1])
    add({ u: U[iu], v: V[iv], h: Hh[0] }, { u: U[iu], v: V[iv], h: Hh[1] }, uFace(iu), vFace(iv));
  return edges;
}
