import test from "node:test";
import assert from "node:assert/strict";
import { fetchProfile } from "../src/github.mjs";

const okResponse = (payload) => async () => ({ ok: true, status: 200, json: async () => payload });

test("rejects invalid usernames before any request", async () => {
  await assert.rejects(() => fetchProfile("bad name!", "t", async () => assert.fail("must not fetch")), /not a valid/);
});

test("requires a token", async () => {
  await assert.rejects(() => fetchProfile("octocat", "", async () => assert.fail("must not fetch")), /token is required/);
});

test("maps the GraphQL payload into our data shape", async () => {
  const payload = {
    data: {
      user: {
        name: null,
        login: "octocat",
        contributionsCollection: {
          contributionCalendar: { weeks: [{ contributionDays: [{ date: "2026-01-01", contributionCount: 4 }] }] },
        },
        repositories: { nodes: [{ name: "r", stargazerCount: 3, primaryLanguage: null }] },
      },
    },
  };
  const data = await fetchProfile("octocat", "t", okResponse(payload));
  assert.equal(data.name, "octocat");
  assert.deepEqual(data.weeks[0][0], { date: "2026-01-01", count: 4 });
  assert.equal(data.repos[0].color, null);
});

test("surfaces API errors", async () => {
  await assert.rejects(() => fetchProfile("octocat", "t", okResponse({ errors: [{ message: "Bad credentials" }] })), /Bad credentials/);
  await assert.rejects(() => fetchProfile("octocat", "t", async () => ({ ok: false, status: 401 })), /HTTP 401/);
  await assert.rejects(() => fetchProfile("octocat", "t", okResponse({ data: { user: null } })), /not found/);
});
