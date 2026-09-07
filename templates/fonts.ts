import { Font } from "@react-pdf/renderer";

/**
 * Registers Inter for resume templates — react-pdf's built-in fonts are
 * Helvetica/Times-Roman/Courier only. Font files are hosted locally under
 * public/fonts/ rather than fetched from a CDN at render time, so PDF
 * generation doesn't depend on external network access.
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
