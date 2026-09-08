const LIVE_PREVIEW_PAGE_SELECTOR =
  ".live-preview-pane canvas.pdf-canvas-viewer__page";

const WAIT_TIMEOUT_MS = 8_000;

/**
 * Copies the editor's already-rasterized live-preview canvases into PNG
 * object URLs. The PNG export dialog shows these as `<img>`s so it never
 * runs a second PDF layout or pdfjs pass — toggle/filter is just CSS.
 *
 * Callers must `URL.revokeObjectURL` each string when finished.
 */
export async function captureLivePreviewPages(): Promise<string[]> {
  const canvases = await waitForLivePreviewCanvases();
  return Promise.all(canvases.map(canvasToObjectUrl));
}

function waitForLivePreviewCanvases(): Promise<HTMLCanvasElement[]> {
  return new Promise((resolve, reject) => {
    const started = performance.now();

    const tick = () => {
      const canvases = [
        ...document.querySelectorAll<HTMLCanvasElement>(
          LIVE_PREVIEW_PAGE_SELECTOR,
        ),
      ];
      if (canvases.length > 0) {
        resolve(canvases);
        return;
      }
      if (performance.now() - started >= WAIT_TIMEOUT_MS) {
        reject(new Error("Live preview isn't ready yet."));
        return;
      }
      requestAnimationFrame(tick);
    };

    tick();
  });
}

function canvasToObjectUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Couldn't capture a preview page."));
        return;
      }
      resolve(URL.createObjectURL(blob));
    }, "image/png");
  });
}
