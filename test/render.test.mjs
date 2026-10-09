import test from "node:test";
import assert from "node:assert/strict";
import { renderSvg } from "../src/render.mjs";
import { sampleData } from "../src/sample.mjs";
import { themes } from "../src/themes.mjs";

for (const theme of Object.keys(themes)) {
  test(`renders a clean SVG for theme ${theme}`, () => {
    const svg = renderSvg(sampleData(), { theme });
    assert.match(svg, /^<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.ok(svg.trimEnd().endsWith("</svg>"));
    assert.ok(!/NaN|undefined|Infinity/.test(svg), "no invalid numbers or undefined values");
    assert.ok(svg.length < 600_000, "stays comfortably small for a README");
    assert.match(svg, new RegExp(`stroke="${themes[theme].cellEdge}"`), "terrain uses visible cell edges");
  });
}

test("output is deterministic", () => {
  assert.equal(renderSvg(sampleData()), renderSvg(sampleData()));
});

test("hostile names and colours cannot inject markup", () => {
  const data = sampleData();
  data.name = `<script>alert(1)</script>"&`;
  data.repos[0].name = `"><img src=x onerror=alert(1)>`;
  data.repos[0].color = `red" onload="alert(1)`;
  const svg = renderSvg(data);
  assert.ok(!svg.includes("<script"));
  assert.ok(!svg.includes("<img"));
  assert.ok(!svg.includes('onload="alert'));
});

test("static mode has no animation elements", () => {
  assert.ok(!renderSvg(sampleData(), { animate: false }).includes("<animateMotion"));
  assert.ok(renderSvg(sampleData(), { animate: true }).includes("<animateMotion"));
});

test("unknown theme gives a clear error", () => {
  assert.throws(() => renderSvg(sampleData(), { theme: "nope" }), /Unknown theme/);
});

test("includes an accessible title and description", () => {
  const svg = renderSvg(sampleData());
  assert.match(svg, /<title>Ada Example: \d+ contributions/);
  assert.match(svg, /<desc>3D contribution terrain for @ada-example/);
});

test("labels months along the plate and marks the peak day", () => {
  const svg = renderSvg(sampleData());
  for (const m of ["Jan", "Jun", "Sep"]) assert.ok(svg.includes(`>${m}</text>`), `month ${m} labelled`);
  assert.ok(svg.includes("Jun 3 · 29"), "peak callout uses a short date and the count");
});

test("an empty calendar renders without a peak beacon or invalid numbers", () => {
  const data = sampleData();
  data.weeks = data.weeks.map((w) => w.map((d) => ({ ...d, count: 0 })));
  const svg = renderSvg(data);
  assert.ok(!/NaN|undefined|Infinity/.test(svg));
  assert.ok(!svg.includes('id="beam"'));
  assert.ok(svg.includes("No activity yet"));
});

test("unexpected repo values cannot break the geometry or the render", () => {
  const data = sampleData();
  data.repos[0].stars = `1" onload="x`;
  data.repos[1].name = null;
  data.repos[2].stars = -5;
  const svg = renderSvg(data);
  assert.ok(!/NaN|undefined|Infinity/.test(svg));
  assert.ok(!svg.includes("onload"));
});

test("night theme outlines bar tops in a lighter tint of their own colour", () => {
  const svg = renderSvg(sampleData(), { theme: "aurora", animate: false });
  assert.ok(themes.aurora.neonEdges);
  assert.ok(!svg.includes(`stroke="${themes.aurora.cellEdge}" stroke-width=".6" stroke-opacity=".62"`), "bar tops no longer use the flat cell edge");
  assert.match(svg, /stroke-width="1" stroke-opacity="\.95"/);
});

test("day theme is clean white with pink and green borders", () => {
  const t = themes.daylight;
  assert.deepEqual([t.bgInner, t.bgMid, t.bgOuter, t.plateTop], ["#ffffff", "#ffffff", "#ffffff", "#ffffff"]);
  const svg = renderSvg(sampleData(), { theme: "daylight", animate: false });
  assert.match(svg, new RegExp(`id="glassEdge"[^>]*><stop offset="0" stop-color="${t.borderA}"[^>]*/><stop offset="1" stop-color="${t.borderB}"`));
  assert.match(svg, new RegExp(`fill="url\\(#plateFill\\)" stroke="${t.plateEdge}"`));
});

test("a colour wave rolls across the grid in animated mode only", () => {
  const data = sampleData();
  for (const theme of ["aurora", "daylight"]) {
    const t = themes[theme];
    const svg = renderSvg(data, { theme, animate: true });
    const strips = svg.split(`values="${t.wave.join(";")}" calcMode="discrete"`).length - 1;
    assert.equal(strips, data.weeks.length, `${theme}: one wave strip per week`);
    assert.ok(svg.indexOf(`values="${t.wave.join(";")}"`) < svg.indexOf(`fill="url(#mside`), "the wave sits under the bars");
    assert.ok(!renderSvg(data, { theme, animate: false }).includes(t.wave.join(";")), `${theme}: static mode has no wave`);
  }
});

test("the plate has glowing pink and green neon-tube edges in both themes", () => {
  for (const theme of ["aurora", "daylight"]) {
    const t = themes[theme];
    const svg = renderSvg(sampleData(), { theme, animate: false });
    for (const c of [t.edgeBack, t.edgeFront]) {
      assert.match(svg, new RegExp(`stroke="${c}" stroke-width="2.6"[^>]*filter="url\\(#neon\\)"`), `${theme}: ${c} tube`);
    }
  }
  assert.match(renderSvg(sampleData(), { theme: "daylight" }), /stroke="url\(#glassEdge\)" stroke-width="2" filter="url\(#neon\)"/, "day cards glow");
});

test("day and night themes share one neon palette", () => {
  const { aurora: a, daylight: d } = themes;
  assert.deepEqual(d.ramp.slice(1), a.ramp.slice(1), "activity levels");
  for (const k of ["peak", "accents", "wave", "edgeBack", "edgeFront", "glow"]) assert.deepEqual(d[k], a[k], k);
});

test("the slab's front face is a scrolling LED ticker of top repos, in perspective", () => {
  const data = sampleData();
  const svg = renderSvg(data, { animate: true });
  const ticker = svg.slice(svg.indexOf('id="ledFrontText"'), svg.indexOf('id="ledBackDots"'));
  for (const r of data.repos) assert.ok(ticker.includes(`>${r.name.toUpperCase()}<`), `${r.name} on the ticker`);
  assert.match(ticker, /attributeName="transform" type="translate"/, "the ticker scrolls");
  assert.equal(svg.split('href="#ledFrontText"').length - 1, 16, "placed in 16 perspective-correct stretches");
  assert.ok(!renderSvg(data, { animate: false }).includes('type="translate" values='), "static images do not scroll");
});

test("the stadium board shows the headline stats behind the bars", () => {
  const svg = renderSvg(sampleData(), { animate: false });
  const board = svg.slice(svg.indexOf('id="ledBackText"'));
  assert.match(board, /1,126 CONTRIBUTIONS/);
  assert.match(board, /LONGEST STREAK 10D/);
  assert.ok(svg.indexOf('href="#ledBackText"') < svg.indexOf('fill="url(#mside'), "board is drawn before the bars");
});

test("a light-cycle trail rides the longest streak and is tagged with its length", () => {
  const svg = renderSvg(sampleData(), { animate: true });
  assert.ok(svg.includes(">10-DAY STREAK<"));
  assert.match(svg, /attributeName="stroke-dashoffset"/, "the trail draws itself");
  const empty = sampleData();
  empty.weeks = empty.weeks.map((w) => w.map((d) => ({ ...d, count: 0 })));
  assert.ok(!renderSvg(empty).includes("-DAY STREAK"), "no trail without a streak");
});

test("bars and tiles are lit with gradient materials and cast contact shadows", () => {
  const svg = renderSvg(sampleData(), { animate: false });
  assert.match(svg, /<linearGradient id="mside[0-9a-f]{6}\d+"/, "side material");
  assert.match(svg, /<linearGradient id="mtop[0-9a-f]{6}\d+"/, "top material");
  assert.match(svg, /filter="url\(#aoBlur\)"/, "contact shadows");
  assert.ok(!/id="(m(side|top)[^"]+)"[\s\S]*id="\1"/.test(svg), "each material is defined once");
});

test("handles and repo names on the LED boards are escaped", () => {
  const data = sampleData();
  data.login = `x"><script>alert(1)</script>`;
  data.repos[0].name = `<img src=x onerror=alert(1)>`;
  const svg = renderSvg(data);
  assert.ok(!svg.includes("<script") && !svg.includes("<img") && !svg.includes("<IMG"));
});
