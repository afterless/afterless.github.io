import type { SiteTheme } from "../types/siteTheme";

export const defaultSiteTheme: SiteTheme = {
  id: "purple-rail",
  name: "Purple Rail",
  mode: "yin rail, red accent",
  principle: "A red-purple game-board palette, made quiet enough for long reading.",
  ink: "#0f0b12",
  paper: "#1a131d",
  panel: "rgba(28, 20, 31, 0.9)",
  text: "#efe4d1",
  muted: "#b7a4b9",
  accent: "#bb6950",
  accentTwo: "#8b6aa2",
  door: "#71394b",
  glow: "rgba(139, 106, 162, 0.26)",
  shadow: "rgba(0, 0, 0, 0.5)",
  grain: 0.18,
  tilt: -2,
  density: 1.3,
};

export function cssVars(theme: SiteTheme) {
  return [
    `--ink:${theme.ink}`,
    `--paper:${theme.paper}`,
    `--panel:${theme.panel}`,
    `--text:${theme.text}`,
    `--muted:${theme.muted}`,
    `--accent:${theme.accent}`,
    `--accent-two:${theme.accentTwo}`,
    `--door:${theme.door}`,
    `--glow:${theme.glow}`,
    `--site-shadow:${theme.shadow}`,
    `--grain-opacity:${theme.grain}`,
    `--site-tilt:${theme.tilt}deg`,
    `--door-density:${theme.density}`,
  ].join(";");
}
