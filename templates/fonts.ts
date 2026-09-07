import { Font } from "@react-pdf/renderer";

/**
 * Registers Inter (body) and Gilroy (titles) for resume templates.
 * react-pdf's built-in fonts are Helvetica/Times-Roman/Courier only.
 *
 * Files live under `public/fonts/` as TTF — react-pdf embeds these into the
 * PDF, and both the live preview and the download go through `toPdfBlob`,
 * so they stay identical. App chrome loads Gilroy as woff2 separately
 * (`public/assets/fonts/`); do not point this register at those files.
 *
 * Side-effect import: `import "../fonts"` once per template registers this
 * for that module graph (ES modules are evaluated once and cached).
 */
Font.register({
  family: "Inter",
  fonts: [
    { src: "/fonts/Inter-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Inter-Bold.ttf", fontWeight: 700 },
  ],
});

Font.register({
  family: "Gilroy",
  fonts: [
    { src: "/fonts/Gilroy-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Gilroy-Medium.ttf", fontWeight: 500 },
    { src: "/fonts/Gilroy-Semibold.ttf", fontWeight: 600 },
    { src: "/fonts/Gilroy-Bold.ttf", fontWeight: 700 },
    { src: "/fonts/Gilroy-Black.ttf", fontWeight: 900 },
  ],
});

/**
 * react-pdf hyphenates long words that don't fit a line by default. Resumes
 * should wrap on word boundaries only — a hyphen-split name or job title
 * reads as a typo, not a line break — so this disables it globally.
 */
Font.registerHyphenationCallback((word) => [word]);
