/**
 * Extracts HTML (not plain text) from a DOCX file, client-side. HTML is kept
 * rather than flattened so heading/bold tags survive as section-boundary
 * signals for the heuristic parser — flattening to plain text loses them.
 *
 * mammoth is only needed once a .docx is actually attached, so it's loaded
 * lazily here rather than shipping in the editor's initial bundle.
 */
export async function extractDocxText(file: File): Promise<string> {
  const [{ default: mammoth }, arrayBuffer] = await Promise.all([
    import("mammoth"),
    file.arrayBuffer(),
  ]);
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value;
}
