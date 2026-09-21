import { recordResumeSave, type ResumeHistoryAction } from "./resumeHistory";
import { recordVersionActivity } from "./resumeVersions";

/**
 * Everything to log after a resume is written: the edit-history entry and
 * the author's version countdown. Both swallow their own errors.
 */
export async function recordResumeActivity(args: {
  resumeId: string;
  userId: string;
  action: ResumeHistoryAction;
  resumeJson: string;
}): Promise<void> {
  await Promise.all([
    recordResumeSave(args.resumeId, args.userId, args.action),
    recordVersionActivity(args.resumeId, args.userId, args.resumeJson),
  ]);
}
