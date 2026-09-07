/**
 * Saves a Blob to the user's downloads via a throwaway anchor click — the
 * standard client-side download pattern, shared by every export entry
 * point (editor Export menu, dashboard's per-card download).
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
