/**
 * Overrides app/loading.tsx's dashboard skeleton for this segment — the
 * login page isn't the dashboard, so the route-level fallback should stay
 * blank rather than flash dashboard content.
 */
export default function LoginLoading() {
  return null;
}
