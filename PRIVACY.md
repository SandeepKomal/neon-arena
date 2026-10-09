# Privacy Notice

**Neon Arena — Privacy Notice**  
Effective: 2026-10-02

## Publisher and responsibility

**Publisher:** Sandeep Komal Pothu, maintainer of [SandeepKomal/neon-arena](https://github.com/SandeepKomal/neon-arena).

For the Neon Arena Action, the publisher is responsible for the project's collection, processing, security, and integrity of the data described in this notice. Neon Arena does not represent itself as collecting or processing GitHub Personal Data on GitHub's behalf.

## What Neon Arena does

Neon Arena is a GitHub Action and local Node.js CLI that reads GitHub profile and repository information and generates a static SVG visualization.

The current implementation requests through GitHub's GraphQL API:

- GitHub user name and login
- contribution calendar data
- up to six public, non-fork repositories owned by the selected user
- repository star counts
- primary-language color metadata

The exact data available can also depend on the token and GitHub API behavior at the time the Action runs.

## Where processing occurs

For the GitHub Action, processing occurs on the GitHub Actions runner executing the user's workflow.

Neon Arena does not operate a hosted rendering server and the repository contains no application code for sending generated SVGs or profile data to an external Neon Arena analytics service.

For local CLI usage, processing occurs on the user's own machine.

## Tokens and credentials

The Action receives the GitHub token supplied by the workflow through the `github-token` input and passes it to the existing renderer through the `GITHUB_TOKEN` environment variable.

Tokens should be stored in GitHub Actions secrets and should never be committed to source control.

Users are responsible for choosing an appropriate least-privilege token and reviewing the permissions granted to the workflow.

## Generated files

The generated SVG may contain profile information returned by GitHub, including the selected user's name/login, contribution statistics, repository names, and repository metadata.

Users should treat generated SVG files as containing the information they choose to publish in their profile README.

## Logs and GitHub services

Workflow commands can produce normal GitHub Actions logs. GitHub may process data according to its own terms and privacy policies.

Neon Arena does not add a separate analytics, advertising, or telemetry service.

## Data retention

Neon Arena does not maintain a separate project-controlled database for the profile data it processes. Generated SVGs may remain in the user's repository according to the user's repository history, backups, forks, caches, or other GitHub retention mechanisms.

## Storage location and residency

Neon Arena does not intentionally store the processed profile data in a project-operated database or separate hosting service. Workflow execution and repository storage are provided by GitHub. The country or region in which GitHub processes or stores data can depend on GitHub's infrastructure, service configuration, and any applicable organization data-residency settings. Neon Arena does not select or independently control a separate storage country.

## Third-party components

The Marketplace wrapper uses GitHub's `actions/setup-node` Action. See [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).

## Contact

For privacy questions about the project, open a general GitHub issue.

Security vulnerabilities should be reported using [SECURITY.md](./SECURITY.md) rather than a public issue.

## Legal note

This notice describes the current repository behavior and is not legal advice. Applicable privacy obligations can vary by jurisdiction, organization, and deployment.
