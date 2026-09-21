import { avatarFromColumns, type AvatarPreferences } from "@/lib/avatar";
import { sql } from "@/lib/db/client";

export type ResumeHistoryAction = "created" | "edited";

export interface ResumeHistoryUser {
  id: string;
  name: string;
  email: string;
  avatar: AvatarPreferences;
}

export interface ResumeHistoryEntry {
  id: string;
  action: ResumeHistoryAction;
  savedAt: string;
  /** null when the author's account has since been deleted. */
  user: ResumeHistoryUser | null;
}

/** Saves by the same person within this window share one history entry. */
const COALESCE_WINDOW_MINUTES = 5;

/** Most entries returned to the timeline. */
const HISTORY_LIMIT = 200;

/**
 * Records that `userId` saved `resumeId`. An "edited" save right after the
 * same person's previous one only moves that entry's time forward, so
 * autosave doesn't create an entry per keystroke pause. Never throws: history
 * is secondary, and a failure here must not fail the save itself.
 */
export async function recordResumeSave(
  resumeId: string,
  userId: string,
  action: ResumeHistoryAction,
): Promise<void> {
  try {
    if (action === "edited") {
      const merged = (await sql`
        UPDATE resume_history SET saved_at = now()
        WHERE id = (
          SELECT id FROM (
            SELECT id, user_id, action, saved_at FROM resume_history
            WHERE resume_id = ${resumeId}
            ORDER BY saved_at DESC LIMIT 1
          ) latest
          WHERE user_id = ${userId}
            AND action = 'edited'
            AND saved_at > now() - make_interval(mins => ${COALESCE_WINDOW_MINUTES})
        )
        RETURNING id
      `) as Array<{ id: string }>;
      if (merged.length > 0) return;
    }

    await sql`
      INSERT INTO resume_history (resume_id, user_id, action)
      VALUES (${resumeId}, ${userId}, ${action})
    `;
  } catch (error) {
    console.error("Failed to record resume history:", error);
  }
}

interface HistoryRow {
  id: string;
  action: ResumeHistoryAction;
  saved_at: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  avatar_hue: number | null;
  avatar_expression: string | null;
}

/** Newest-first history for a resume. Callers must check access first. */
export async function listResumeHistory(
  resumeId: string,
): Promise<ResumeHistoryEntry[]> {
  const rows = (await sql`
    SELECT h.id, h.action, h.saved_at, h.user_id,
      u.email AS user_email, u.name AS user_name,
      u.avatar_hue, u.avatar_expression
    FROM resume_history h
    LEFT JOIN users u ON u.id = h.user_id
    WHERE h.resume_id = ${resumeId}
    ORDER BY h.saved_at DESC
    LIMIT ${HISTORY_LIMIT}
  `) as HistoryRow[];

  return rows.map((row) => ({
    id: String(row.id),
    action: row.action,
    savedAt: new Date(row.saved_at).toISOString(),
    user:
      row.user_id && row.user_email
        ? {
            id: row.user_id,
            name: row.user_name?.trim() || row.user_email.split("@")[0],
            email: row.user_email,
            avatar: avatarFromColumns(row.avatar_hue, row.avatar_expression),
          }
        : null,
  }));
}
