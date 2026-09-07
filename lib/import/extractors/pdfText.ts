import { getPdfjs } from "@/lib/pdf/pdfjs";

/**
 * Extracts plain text from a PDF file, client-side, for the import pipeline.
 * pdfjs's `getTextContent()` returns text items without line breaks, so this
 * approximates them by starting a new line whenever an item's baseline
 * y-coordinate jumps from the previous one.
 */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await getPdfjs();
  const buffer = await file.arrayBuffer();
  const pdfDoc = await pdfjs.getDocument({ data: buffer }).promise;

  const lines: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber += 1) {
    const page = await pdfDoc.getPage(pageNumber);
    const content = await page.getTextContent();

    let currentLine = "";
    let lastY: number | null = null;

    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 1) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = "";
      }
      currentLine += item.str;
      lastY = y;
    }
    if (currentLine.trim()) lines.push(currentLine.trim());
  }

  return lines.join("\n");
}
