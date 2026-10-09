# Licensing and Provenance

## Copyright

Copyright (c) 2026 Sandeep Komal Pothu.

The repository is maintained and published from the **SandeepKomal/neon-arena** GitHub repository.

## Source-code license

Neon Arena is released under the MIT License. See [LICENSE](./LICENSE) for the complete license text.

The MIT license permits use, copying, modification, publication, distribution, sublicensing, and sale of the licensed software, subject to retention of the copyright and permission notice and the other terms in the license.

## Current project provenance

The current repository is an independent implementation of the Neon Arena renderer, command-line interface, GitHub data retrieval, themes, tests, and Marketplace wrapper.

Neon Arena is derived from [Git3D Universe](https://github.com/SandeepKomal/Git3D-Universe), an MIT-licensed project by the same author (Sandeep Komal Pothu). The shared code (GitHub data retrieval, statistics, projection, themes and test harness) was written for that project and carried over by its copyright holder. No third-party code came with it.

The repository currently has no declared npm runtime dependencies. The Marketplace wrapper uses the GitHub-maintained `actions/setup-node` action; its applicable notice is recorded in [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).

No third-party fonts, icons, templates, or image libraries are intentionally bundled by the current source tree.

## Visual design provenance

The rendered scene is composed entirely by the project's own code in `src/render.mjs`, `src/arena.mjs`, `src/neon.mjs`, `src/geometry.mjs`, and `src/themes.mjs`. That includes the perspective camera, the lit terrain and slab with gradient materials, raised tiles and contact shadows, the neon-tube edges, the colour wave, the dot-matrix LED ticker and stadium board (text projected onto the slab in perspective), the streak light-cycle, the peak-day beacon, the floor grid, the nebula backdrop, the stats and legend cards, and the prism legend. All colour values are defined in `src/themes.mjs`. No external images, icon sets, fonts, SVG templates, or generated artwork are embedded. The font stack refers only to fonts already installed on the viewer's system.

## Release review

### v1.0.0 (2026-10-09)

- **Third-party code:** none. All code in `src/` and `test/` is original to this project and to Git3D Universe, by the same author.
- **Assets:** no images, icon sets, fonts, SVG templates or generated artwork. The preview SVGs are produced by the project's own renderer from built-in sample data.
- **Dependencies:** none at runtime or for development. `action.yml` pins `actions/setup-node` by commit SHA, as recorded in [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
- **Design references:** other contribution visualizers were viewed only as rendered output, never as source code. Their signature visual elements were deliberately not reproduced.
- **Security:** repository fields are normalised and all text is escaped before rendering. Hostile-input tests check that no markup can be injected.

## Contributions

Contributors retain whatever rights they have in their contributions and grant the project the rights necessary to distribute those contributions under the project's applicable license, subject to the project's contribution terms and GitHub's hosting terms.

Before accepting externally contributed code or assets, maintainers should confirm that the contributor has the right to submit them and that any third-party obligations are documented.

## Generated assets

The repository contains generated SVG previews used for documentation and examples. Generated output is produced from the project's renderer and sample data.

Third-party provenance or metadata embedded in an individual generated asset, if any, should not be interpreted as a separate license for the underlying Neon Arena source code. Any externally sourced material intentionally included in an asset must be documented in [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).

## Trademarks and services

Neon Arena is an independent project. GitHub names, logos, and other trademarks remain the property of their respective owners. The project uses GitHub's APIs and GitHub Actions but does not claim ownership of GitHub branding.

## Legal note

This file describes the project's intended licensing and provenance posture based on the current repository contents. It is not legal advice.
