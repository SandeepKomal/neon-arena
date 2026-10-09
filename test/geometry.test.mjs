import test from "node:test";
import assert from "node:assert/strict";
import { makeProjector, prismFaces } from "../src/geometry.mjs";

test("projection origin lands on the centre point", () => {
  const p = makeProjector({ yawDeg: -26, pitchDeg: 58, cx: 100, cy: 50 });
  const o = p(0, 0, 0);
  assert.equal(o.x, 100);
  assert.equal(o.y, 50);
});

test("raising height moves a point up the screen", () => {
  const p = makeProjector({ yawDeg: -26, pitchDeg: 58, cx: 0, cy: 0 });
  assert.ok(p(0, 0, 10).y < p(0, 0, 0).y);
});

test("a prism shows two sides and a top, never hidden faces", () => {
  const p = makeProjector({ yawDeg: -26, pitchDeg: 58, cx: 0, cy: 0 });
  const faces = prismFaces(p, 0, 0, 10, 20);
  assert.equal(faces.length, 3);
  assert.equal(faces.filter((f) => f.top).length, 1);
  for (const f of faces) assert.ok(f.pts.every((q) => Number.isFinite(q.x) && Number.isFinite(q.y)));
});

test("perspective makes nearer points larger and keeps the centre fixed", () => {
  const p = makeProjector({ yawDeg: -24, pitchDeg: 50, cx: 0, cy: 0, distance: 1500 });
  const o = makeProjector({ yawDeg: -24, pitchDeg: 50, cx: 0, cy: 0 });
  assert.equal(p(0, 0, 0).x, 0);
  const span = (proj, v) => Math.abs(proj(10, v, 0).x - proj(0, v, 0).x);
  assert.ok(span(p, 300) > span(o, 300), "near side is magnified");
  assert.ok(span(p, -300) < span(o, -300), "far side is shrunk");
});

test("face visibility under perspective matches the orthographic rule at the centre", () => {
  const p = makeProjector({ yawDeg: -24, pitchDeg: 50, cx: 0, cy: 0, distance: 1500 });
  for (const n of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
    assert.equal(p.faceVisible(n[0], n[1], 0, 0), p.facing(n[0], n[1]) > 0, `normal ${n}`);
  }
});
