# Security Policy

## Supported versions

Security fixes are targeted at the latest released version and the `main` branch. Users should keep their action reference pinned to a reviewed release or commit SHA.

## Reporting a vulnerability

Please do not open a public issue for a suspected security vulnerability.

Use GitHub's private vulnerability reporting flow from the repository's **Security** tab when it is available. Include:

- the affected version, tag, or commit SHA
- a clear description of the issue and its security impact
- reproducible steps or a minimal proof of concept
- any relevant logs, requests, or configuration
- whether the issue affects the GitHub Action, CLI, token handling, or generated SVG

Do not include active access tokens, credentials, or other secrets in a report.

If private vulnerability reporting is not enabled for the repository, contact the maintainer privately through the GitHub profile for **@SandeepKomal** and do not disclose the issue publicly until a fix or mitigation is available.

## Security model

Neon Arena runs on the user's GitHub Actions runner or local machine.

- The Action passes the supplied GitHub token through the `GITHUB_TOKEN` environment variable rather than placing it in the command-line arguments.
- GitHub data is requested directly from GitHub's GraphQL API at `api.github.com`.
- The project does not use a hosted rendering service or send generated SVG data to a separate application server.
- The generated SVG is written to the output path selected by the workflow.
- Repository names and profile text are escaped before being inserted into SVG markup, and repository colors are validated before use.
- Users should grant the token only the minimum read access required for the data they intend to visualize and store tokens only in GitHub Actions secrets.

## Scope

Security reports are especially relevant to:

- token exposure or unintended credential handling
- remote-code-execution paths introduced by the Action wrapper
- unsafe shell argument handling
- SVG markup injection or unsafe data rendering
- unintended network destinations or telemetry
- supply-chain changes that introduce unauthorized code or assets

Issues that are solely caused by GitHub-hosted infrastructure, the GitHub API itself, or third-party services outside this repository are generally outside project scope.

## Dependency and provenance policy

The runtime project currently declares no npm dependencies. The Marketplace Action wrapper uses GitHub's maintained `actions/setup-node` action to provide Node.js 24 on the runner.

Any future third-party package, action, font, icon, image, generated asset, or other externally sourced material must be reviewed for licensing and security impact and documented in `THIRD-PARTY-NOTICES.md` before release.
