/**
 * Overrides app/loading.tsx's dashboard skeleton for this segment — the
 * editor page is a client component that already renders its own skeleton
 * while it loads (see hasLoaded in page.tsx), so the route-level fallback
 * should stay blank rather than flash dashboard content.
 */
export default function EditorLoading() {
  return null;
}
