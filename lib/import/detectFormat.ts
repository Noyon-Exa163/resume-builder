export type DetectedFormat = "pdf" | "docx" | "markdown" | "json" | "text" | "unknown";

/**
 * Detects an uploaded file's format by MIME type, falling back to extension
 * for the many browsers/OSes that report an empty or generic `file.type`.
 */
export function detectFormat(file: File): DetectedFormat {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";

  if (
    type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return "docx";
  }

  if (type === "application/json" || name.endsWith(".json")) return "json";

  if (
    type === "text/markdown" ||
    name.endsWith(".md") ||
    name.endsWith(".markdown")
  ) {
    return "markdown";
  }

  if (type === "text/plain" || name.endsWith(".txt")) return "text";

  return "unknown";
}
