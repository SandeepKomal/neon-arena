// Fetches the data we need from GitHub's public GraphQL API.
// Requires a token with the `read:user` scope.

const LOGIN_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

const QUERY = `
query ($login: String!) {
  user(login: $login) {
    name
    login
    contributionsCollection {
      contributionCalendar {
        weeks { contributionDays { date contributionCount } }
      }
    }
    repositories(first: 6, isFork: false, privacy: PUBLIC, ownerAffiliations: OWNER,
                 orderBy: { field: STARGAZERS, direction: DESC }) {
      nodes { name stargazerCount primaryLanguage { color } }
    }
  }
}`;

export async function fetchProfile(login, token, fetchImpl = fetch) {
  if (!LOGIN_PATTERN.test(login)) throw new Error(`"${login}" is not a valid GitHub username.`);
  if (!token) throw new Error("A GitHub token is required (scope: read:user).");

  const res = await fetchImpl("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "neon-arena",
    },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
  });

  if (!res.ok) throw new Error(`GitHub API responded with HTTP ${res.status}.`);
  const body = await res.json();
  if (body.errors?.length) throw new Error(`GitHub API error: ${body.errors[0].message}`);

  const user = body.data?.user;
  if (!user) throw new Error(`User "${login}" was not found.`);

  return {
    name: user.name || user.login,
    login: user.login,
    generatedAt: new Date().toISOString().slice(0, 10),
    weeks: user.contributionsCollection.contributionCalendar.weeks.map((w) =>
      w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount }))
    ),
    repos: user.repositories.nodes.map((r) => ({
      name: r.name,
      stars: r.stargazerCount,
      color: r.primaryLanguage?.color || null,
    })),
  };
}
