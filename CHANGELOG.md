# Changelog

All notable changes to Neon Arena are documented here.

## [1.0.0] - 2026-10-09

First release. Neon Arena turns a GitHub contribution calendar into a neon 3D stadium, drawn as a single self-contained SVG.

- **Parallel 3D view:** the arena is drawn in a parallel (orthographic) view, like a technical drawing. Both ends of the slab are the same size, every edge stays parallel, bars stand upright, and the slab's left end shows as a closed face joined to the top and front. Face and edge visibility are worked out from the view direction.
- **Solid boxes:** the slab and the stadium board are drawn as real boxes. Their sides are a dark casing that matches the LED screens, only the edges the camera can see are drawn, and every visible edge is a slim neon tube with a tight glow. Edges that run from back to front fade pink, purple, blue, green, so the colour stays vivid and the tubes join cleanly at every corner.
- **Lit terrain:** every day with activity is a bar with gradient-lit sides and a specular top. Every empty day is a raised tile. Bars cast soft contact shadows.
- **LED ticker:** the slab's front face is an LED screen set inside a dark bezel, mapped onto the face in 3D, so text never runs into the box's edges. It scrolls your top repositories and their stars in crisp, solid letters with a soft bloom and a fine LED grid, so the names stay readable at the size GitHub shows the image.
- **Stadium board:** an LED board with real thickness stands just behind the slab, like a screen behind an arena, so the slab stays a clean box with all four top edges showing. It scrolls your headline stats: handle, contributions, active days, longest streak and peak day.
- **Streak light-cycle:** a neon trail rides over the bar tops across your longest streak and ends in an "N-DAY STREAK" tag.
- **Neon box:** every visible slab edge is a glowing tube, pink at the back and green at the front. A colour wave rolls across the grid in animated mode.
- **Two themes:** `aurora` (night) and `daylight` (clean white). Both use the same neon palette.
- **GitHub Action** with `username`, `github-token`, `theme`, `output` and `no-motion` inputs, plus a local CLI.
- No runtime dependencies. All profile and repository text is escaped before it reaches the SVG.

Neon Arena began as a design concept inside [Git3D Universe](https://github.com/SandeepKomal/Git3D-Universe), by the same author, and is now developed as its own project.
