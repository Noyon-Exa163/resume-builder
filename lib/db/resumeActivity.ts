import { recordResumeSave, type ResumeHistoryAction } from "./resumeHistory";
import { recordVersionActivity } from "./resumeVersions";
import type { ResumeData } from "@/lib/schema/resume";

/**
 * Everything to log after a resume is written: the edit-history entry and
 * the author's version countdown. Both swallow their own errors.
 */
export async function recordResumeActivity(args: {
  resumeId: string;
  userId: string;
  action: ResumeHistoryAction;
  /** The validated resume as written — bound as a jsonb object parameter
   *  (pre-stringifying it would store a double-encoded string scalar under
   *  postgres.js; see db/migrations/0011). */
  snapshot: ResumeData;
}): Promise<void> {
  await Promise.all([
    recordResumeSave(args.resumeId, args.userId, args.action),
    recordVersionActivity(args.resumeId, args.userId, args.snapshot),
  ]);
}
