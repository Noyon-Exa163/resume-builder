/** Reads a Markdown (or plain text) file as-is — no transformation needed. */
export async function extractMarkdownText(file: File): Promise<string> {
  return file.text();
}
