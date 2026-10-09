#!/usr/bin/env node
import { parseArgs } from "node:util";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fetchProfile } from "./github.mjs";
import { sampleData } from "./sample.mjs";
import { renderSvg } from "./render.mjs";
import { themes } from "./themes.mjs";

const { values } = parseArgs({
  options: {
    user: { type: "string" },
    token: { type: "string" },
    out: { type: "string", default: "profile/neon-arena.svg" },
    theme: { type: "string", default: "aurora" },
    sample: { type: "boolean", default: false },
    "no-motion": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help) {
  console.log(`neon-arena

  --user <login>     GitHub username (default: $GITHUB_REPOSITORY_OWNER)
  --token <pat>      Token with read:user (default: $GITHUB_TOKEN)
  --theme <name>     ${Object.keys(themes).join(" | ")} (default: aurora)
  --out <file>       Output SVG path (default: profile/neon-arena.svg)
  --no-motion        Static image: no ticker scroll, streak trail or colour wave
  --sample           Use fake data, no network or token needed`);
  process.exit(0);
}

try {
  let data;
  if (values.sample) {
    data = sampleData();
  } else {
    const login = values.user || process.env.GITHUB_REPOSITORY_OWNER;
    const token = values.token || process.env.GITHUB_TOKEN;
    if (!login) throw new Error("Pass --user <login> (or run with --sample).");
    data = await fetchProfile(login, token);
  }
  const svg = renderSvg(data, { theme: values.theme, animate: !values["no-motion"] });
  mkdirSync(dirname(values.out), { recursive: true });
  writeFileSync(values.out, svg);
  console.log(`Wrote ${values.out}`);
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
