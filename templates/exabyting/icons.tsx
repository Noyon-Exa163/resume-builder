import type { ReactNode } from "react";
import { Circle, Path, Rect, Svg } from "@react-pdf/renderer";

/**
 * Small vector icons for the contact line, drawn with react-pdf's SVG
 * primitives (lucide's React components render DOM SVG, which react-pdf
 * can't consume directly). Utility icons use stroke paths; brand marks use
 * filled paths so they stay legible at 10px in PDF output.
 */

export interface IconProps {
  size?: number;
  color?: string;
}

const STROKE_PROPS = {
  fill: "none",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function MailIcon({ size = 10, color = "#000000" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} {...STROKE_PROPS} />
      <Path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" stroke={color} {...STROKE_PROPS} />
    </Svg>
  );
}

export function PhoneIcon({ size = 10, color = "#000000" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
        stroke={color}
        {...STROKE_PROPS}
      />
    </Svg>
  );
}

export function MapPinIcon({ size = 10, color = "#000000" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
        stroke={color}
        {...STROKE_PROPS}
      />
      <Circle cx="12" cy="10" r="3" stroke={color} {...STROKE_PROPS} />
    </Svg>
  );
}

export function LinkIcon({ size = 10, color = "#000000" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
        stroke={color}
        {...STROKE_PROPS}
      />
      <Path
        d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
        stroke={color}
        {...STROKE_PROPS}
      />
    </Svg>
  );
}

/** GitHub mark — simplified from the official octocat silhouette. */
export function GitHubIcon({ size = 10, color = "#000000" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M12 0.297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385 0.6 0.111 0.82-0.261 0.82-0.577 0-0.285-0.01-1.04-0.015-2.04-3.338 0.724-4.042-1.61-4.042-1.61-0.546-1.385-1.335-1.755-1.335-1.755-1.087-0.744 0.083-0.729 0.083-0.729 1.205 0.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492 0.997 0.107-0.775 0.418-1.305 0.76-1.605-2.665-0.305-5.467-1.334-5.467-5.931 0-1.311 0.469-2.381 1.236-3.221 0.124-0.303 0.535-1.524 0.117-3.176 0 0 1.008-0.322 3.301 1.23 0.957-0.266 1.983-0.399 3.003-0.404 1.02 0.005 2.047 0.138 3.006 0.404 2.291-1.552 3.297-1.23 3.297-1.23 0.653 1.653 0.242 2.874 0.118 3.176 0.77 0.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921 0.43 0.372 0.823 1.102 0.823 2.222v3.293c0 0.319 0.192 0.694 0.801 0.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
      />
    </Svg>
  );
}

/** LinkedIn mark — simplified from the official "in" logo. */
export function LinkedInIcon({ size = 10, color = "#000000" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M20.447 20.452h-3.554v-5.569c0-1.328-0.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h0.046c0.477-0.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-0.926-2.063-2.065 0-1.138 0.92-2.063 2.063-2.063 1.14 0 2.064 0.925 2.064 2.063 0 1.139-0.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C0.792 0 0 0.774 0 1.729v20.542C0 23.227 0.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 0.774 23.2 0 22.222 0h0.003z"
      />
    </Svg>
  );
}

export type LinkKind = "github" | "linkedin" | "generic";

export function detectLinkKind(url: string): LinkKind {
  const host = url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];

  if (host === "github.com" || host.endsWith(".github.io")) return "github";
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "linkedin";
  return "generic";
}

export function linkKindIcon(
  url: string,
  color: string,
  size = 10,
): ReactNode {
  switch (detectLinkKind(url)) {
    case "github":
      return <GitHubIcon size={size} color={color} />;
    case "linkedin":
      return <LinkedInIcon size={size} color={color} />;
    default:
      return <LinkIcon size={size} color={color} />;
  }
}
