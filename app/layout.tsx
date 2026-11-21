import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import { AppProviders } from "@/components/common/AppProviders";
import "../styles/globals.css";

const displayFont = localFont({
  src: [
    {
      path: "../public/assets/fonts/Gilroy-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/Gilroy-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/Gilroy-Semibold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/Gilroy-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/Gilroy-Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-gilroy",
  display: "swap",
});

const bodyFont = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Exabyting Resume Builder",
  description: "Build and export company-branded resumes.",
};

// viewportFit "cover" lets fixed chrome pad itself with the safe-area
// tokens; "resizes-content" shrinks the layout (not just the visual
// viewport) when the on-screen keyboard opens, so the AI composer stays
// visible above it.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      /* suppressHydrationWarning: the no-flash script below adds the theme
         class to <html> before React hydrates, so the server-rendered class
         attribute never matches the DOM. React would warn on every page in
         dark mode; this suppresses exactly that element-attribute warning
         (the standard next-themes pattern). */
      suppressHydrationWarning
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
    >
      <body>
        {/* Applies the stored theme before first paint — no flash of the
            wrong mode. Kept in sync with lib/theme (THEME_STORAGE_KEY). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem("exaresume-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
