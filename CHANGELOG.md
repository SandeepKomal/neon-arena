# Changelog

All notable changes to Neon Arena are documented here.

## [1.0.0] - 2026-10-09

First release. Neon Arena turns a GitHub contribution calendar into a neon 3D stadium, drawn as a single self-contained SVG.

- **Parallel 3D view:** the arena is drawn in a parallel (orthographic) view, like a technical drawing. Both ends of the slab are the same size, every edge stays parallel, bars stand upright, and the slab's left end shows as a closed face joined to the top and front. Face and edge visibility are worked out from the view direction.
- **Solid slab:** the slab is drawn as a real box. Its sides are a dark casing that matches the LED screen, and only the faces the camera can see are drawn.
- **Neon loop and underglow:** a single slim neon tube runs round the slab's top, pink along the back and green along the front, with the short ends fading pink, purple, blue, green, so the loop is unbroken at every corner. A soft neon glow lights the floor beneath the slab, in both themes.
- **Lit terrain:** every day with activity is a bar with gradient-lit sides and a specular top. Every empty day is a raised tile. Bars cast soft contact shadows.
- **LED ribbon:** an LED screen wraps round the slab's front face and left end, mapped onto each face in 3D, and the text scrolls round the corner without a break. A dark bezel frames the ribbon's two outer ends, so text never runs into the box's edges. It scrolls your top repositories and their stars in crisp, solid letters with a soft bloom and a fine LED grid, so the names stay readable at the size GitHub shows the image.
- **Streak light-cycle:** a neon trail rides over the bar tops across your longest streak and ends in an "N-DAY STREAK" tag.
- **Colour wave:** a wave of neon light rolls across the grid in animated mode, in both themes.
- **Two themes:** `aurora` (night) and `daylight` (clean white). Both use the same neon palette.
- **GitHub Action** with `username`, `github-token`, `theme`, `output` and `no-motion` inputs, plus a local CLI.
- No runtime dependencies. All profile and repository text is escaped before it reaches the SVG.

Neon Arena began as a design concept inside [Git3D Universe](https://github.com/SandeepKomal/Git3D-Universe), by the same author, and is now developed as its own project.
