import type { ResumeData } from "@/lib/schema/resume";

/** Serializes a resume as a `.json` project file, for cross-device backup. */
export function toJsonBlob(data: ResumeData): Blob {
  return new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
}
