import test from "node:test";
import assert from "node:assert/strict";
import { computeStats, levelOf } from "../src/stats.mjs";

const week = (...counts) => counts.map((count, i) => ({ date: `2026-01-0${i + 1}`, count }));

test("totals, active days and peak", () => {
  const s = computeStats([week(1, 0, 3, 0, 0, 2, 0)]);
  assert.equal(s.total, 6);
  assert.equal(s.activeDays, 3);
  assert.equal(s.max, 3);
  assert.equal(s.peak.date, "2026-01-03");
});

test("longest streak is found anywhere in the range", () => {
  const s = computeStats([week(1, 1, 1, 0, 1, 1, 0)]);
  assert.equal(s.longest, 3);
});

test("an empty today does not break the current streak", () => {
  const s = computeStats([week(0, 0, 1, 1, 1, 1, 0)]);
  assert.equal(s.current, 4);
});

test("an empty yesterday and today means no current streak", () => {
  const s = computeStats([week(1, 1, 1, 1, 1, 0, 0)]);
  assert.equal(s.current, 0);
});

test("all-empty calendar is safe", () => {
  const s = computeStats([week(0, 0, 0, 0, 0, 0, 0)]);
  assert.equal(s.total, 0);
  assert.equal(s.peak.date, null);
  assert.equal(levelOf(0, 0), 0);
});

test("levels scale with the busiest day", () => {
  assert.equal(levelOf(1, 20), 1);
  assert.equal(levelOf(20, 20), 4);
});

test("rank levels spread colours across active days despite one outlier", async () => {
  const { levelByRank } = await import("../src/stats.mjs");
  const q = [2, 4, 7];
  assert.equal(levelByRank(0, q), 0);
  assert.equal(levelByRank(1, q), 1);
  assert.equal(levelByRank(4, q), 2);
  assert.equal(levelByRank(6, q), 3);
  assert.equal(levelByRank(113, q), 4);
});
