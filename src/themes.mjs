// Colour tokens. Every colour that reaches the SVG comes from here.
// Night mode uses glowing neons (blue, green, purple, pink) with a
// radium-yellow peak. Day mode uses the same neon palette on clean white.
// Both have glowing pink and green neon-tube edges on the plate.
// In animated mode a colour wave rolls across the grid in both themes.

export const themes = {
  // Night: fluorescent colours on near-black. Activity goes neon blue →
  // neon green → neon purple → neon pink, and the peak day glows radium yellow.
  aurora: {
    dark: true,
    bgInner: "#0e0b22",
    bgMid: "#07061a",
    bgOuter: "#030308",
    plateTop: "#0d0b20",
    plateEdge: "#3a2b8f",
    plateSide: "#070614",
    ramp: ["#16133a", "#00b7ff", "#39ff14", "#bc13fe", "#ff10f0"],
    peak: "#e6ff00",
    ink: "#f2f4ff",
    mute: "#a6abcf",
    rule: "#241f4f",
    glow: "#ff10f0",
    cellEdge: "#4b3fb0",
    nebulaA: "#ff10f0",
    nebulaB: "#00b7ff",
    grid: "#2a2470",
    accents: ["#ff10f0", "#39ff14", "#00b7ff", "#e6ff00", "#bc13fe", "#00fff0", "#ff7a00"],
    // Empty days drift through this band across the year.
    floor: ["#141137", "#161642", "#141b44", "#18143f", "#1e1242", "#141137"],
    shadow: "#000000",
    borderA: "#ffffff",
    borderB: "#00b7ff",
    // A neon colour wave rolls across the grid in animated mode.
    wave: ["#ff10f0", "#00b7ff", "#39ff14", "#bc13fe"],
    waveOpacity: 0.32,
    // Glowing neon-tube edges on the plate: pink at the back, green at the front.
    edgeBack: "#ff10f0",
    edgeFront: "#39ff14",
    // Neon Arena: LED board panels and the streak light-cycle.
    boardBg: "#05040d",
    streak: "#00fff0",
    // Bar tops get an outline in a tint of their own colour, like a neon tube.
    neonEdges: true,
    stars: true,
  },
  // Day: clean white with exactly the same neon palette as night mode: neon
  // blue → neon green → neon purple → neon pink, and a radium-yellow peak.
  daylight: {
    dark: false,
    bgInner: "#ffffff",
    bgMid: "#ffffff",
    bgOuter: "#ffffff",
    plateTop: "#ffffff",
    plateEdge: "#ff10f0",
    plateSide: "#f6f7fb",
    ramp: ["#ffffff", "#00b7ff", "#39ff14", "#bc13fe", "#ff10f0"],
    peak: "#e6ff00",
    ink: "#141433",
    mute: "#5d6285",
    rule: "#f1e4f3",
    glow: "#ff10f0",
    // Visible grid lines between the empty squares on white.
    cellEdge: "#c3c7de",
    nebulaA: "#ffffff",
    nebulaB: "#ffffff",
    grid: "#eef0f6",
    accents: ["#ff10f0", "#39ff14", "#00b7ff", "#e6ff00", "#bc13fe", "#00fff0", "#ff7a00"],
    floor: ["#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff"],
    shadow: "#9aa0c4",
    // Card borders run pink to green.
    borderA: "#ff10f0",
    borderB: "#39ff14",
    wave: ["#ff10f0", "#00b7ff", "#39ff14", "#bc13fe"],
    waveOpacity: 0.3,
    // Glowing neon-tube edges on the plate, and a glowing frame on the cards.
    edgeBack: "#ff10f0",
    edgeFront: "#39ff14",
    boardBg: "#0d0b1f",
    streak: "#00c8e0",
    neonFrame: true,
    neonEdges: true,
    stars: false,
  },
};

export const FONT_STACK = "ui-sans-serif, 'SF Pro Display', 'Segoe UI', Inter, Helvetica, Arial, sans-serif";
