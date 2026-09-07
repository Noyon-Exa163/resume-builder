import mammoth from "mammoth";

/**
 * Extracts HTML (not plain text) from a DOCX file, client-side. HTML is kept
 * rather than flattened so heading/bold tags survive as section-boundary
 * signals for the heuristic parser — flattening to plain text loses them.
 */
export async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value;
}
