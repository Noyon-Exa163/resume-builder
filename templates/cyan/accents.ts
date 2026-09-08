import type { AccentColor } from "@/lib/schema/resume";

/**
 * Print palettes for the Universal template's accent picker. Hex values are
 * the ExaDesign step-5 / step-1 / step-9 of each hue (black uses the black
 * / neutral.1 / neutral.11 steps) — react-pdf cannot read CSS custom
 * properties, so these stay as plain constants.
 *
 * Order is spectral (blue → orange), then pink, then black.
 */
export interface AccentPalette {
  id: AccentColor;
  name: string;
  brand: string;
  brandSubtle: string;
  /** Chip fill. Most accents stay on neutral.1; orange and pink use their step-1. */
  chipFill: string;
  tagText: string;
  /** Step-3 of the hue — the theme picker's Universal card preview
   *  background, so it shifts with the selected accent (black uses
   *  neutral.3, pink uses bkash.3; see styles/tokens.css for the source
   *  values — app-chrome CSS custom properties can't be read here). */
  previewBg: string;
}

export const DEFAULT_ACCENT_COLOR: AccentColor = "cyan";

export const ACCENT_PRESETS: readonly AccentPalette[] = [
  {
    id: "blue",
    name: "Blue",
    brand: "#0072ED",
    brandSubtle: "#f0f5fe",
    chipFill: "#f6f7f8",
    tagText: "#032468",
    previewBg: "#acccff",
  },
  {
    id: "indigo",
    name: "Indigo",
    brand: "#615fff",
    brandSubtle: "#eef2ff",
    chipFill: "#f6f7f8",
    tagText: "#302b84",
    previewBg: "#c6d2ff",
  },
  {
    id: "cyan",
    name: "Cyan",
    brand: "#00b8db",
    brandSubtle: "#ecfeff",
    chipFill: "#f6f7f8",
    tagText: "#0f4d63",
    previewBg: "#a2f3fc",
  },
  {
    id: "green",
    name: "Green",
    brand: "#00c950",
    brandSubtle: "#f0fdf4",
    chipFill: "#f6f7f8",
    tagText: "#095027",
    previewBg: "#b9f8cf",
  },
  {
    id: "orange",
    name: "Orange",
    brand: "#ff6900",
    brandSubtle: "#fff7ed",
    chipFill: "#fff7ed",
    tagText: "#7c2809",
    previewBg: "#ffd6a5",
  },
  {
    id: "pink",
    name: "Pink",
    /** bkash.7 — darker than the step-5 anchor so titles and links pass on white. */
    brand: "#e2136e",
    brandSubtle: "#ffe9f3",
    chipFill: "#ffe9f3",
    tagText: "#900040",
    previewBg: "#ff9dc8",
  },
  {
    id: "black",
    name: "Black",
    brand: "#000000",
    brandSubtle: "#f6f7f8",
    chipFill: "#f6f7f8",
    tagText: "#010515",
    previewBg: "#d6dbe3",
  },
] as const;

const PRESETS_BY_ID: Record<AccentColor, AccentPalette> = Object.fromEntries(
  ACCENT_PRESETS.map((preset) => [preset.id, preset]),
) as Record<AccentColor, AccentPalette>;

export function resolveAccent(id: string | undefined | null): AccentPalette {
  const resolved = id === "yellow" ? "black" : id;
  if (resolved && resolved in PRESETS_BY_ID) {
    return PRESETS_BY_ID[resolved as AccentColor];
  }
  return PRESETS_BY_ID[DEFAULT_ACCENT_COLOR];
}
