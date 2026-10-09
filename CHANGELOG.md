# Changelog

All notable changes to Neon Arena are documented here.

## [1.0.0] - 2026-10-09

First release. Neon Arena turns a GitHub contribution calendar into a neon 3D stadium, drawn as a single self-contained SVG.

- **Perspective camera:** the arena is drawn in camera perspective with a mild lens, so the near end looms and the far end recedes. Face visibility is worked out from the camera position.
- **Lit terrain:** every day with activity is a bar with gradient-lit sides and a specular top. Every empty day is a raised tile. Bars cast soft contact shadows.
- **LED ticker:** the slab's front face is a dot-matrix LED screen, projected onto the slab in true perspective. It scrolls your top repositories and their stars.
- **Stadium board:** an LED board along the back edge scrolls your headline stats: handle, contributions, active days, longest streak and peak day.
- **Streak light-cycle:** a neon trail rides over the bar tops across your longest streak and ends in an "N-DAY STREAK" tag.
- **Neon box:** every visible slab edge is a glowing tube, pink at the back and green at the front. A colour wave rolls across the grid in animated mode.
- **Two themes:** `aurora` (night) and `daylight` (clean white). Both use the same neon palette.
- **GitHub Action** with `username`, `github-token`, `theme`, `output` and `no-motion` inputs, plus a local CLI.
- No runtime dependencies. All profile and repository text is escaped before it reaches the SVG.

Neon Arena began as a design concept inside [Git3D Universe](https://github.com/SandeepKomal/Git3D-Universe), by the same author, and is now developed as its own project.
