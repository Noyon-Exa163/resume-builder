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
 *
 * One statement does both jobs — merge-when-recent, insert-otherwise — so a
 * save costs a single round trip for history instead of a probe + write.
 */
export async function recordResumeSave(
  resumeId: string,
  userId: string,
  action: ResumeHistoryAction,
): Promise<void> {
  try {
    await sql`
      WITH latest AS (
        SELECT id FROM (
          SELECT id, user_id, action, saved_at FROM resume_history
          WHERE resume_id = ${resumeId}
          ORDER BY saved_at DESC LIMIT 1
        ) l
        WHERE l.user_id = ${userId}
          AND l.action = 'edited'
          AND l.saved_at > now() - make_interval(mins => ${COALESCE_WINDOW_MINUTES})
      ),
      merged AS (
        UPDATE resume_history SET saved_at = now()
        WHERE id IN (SELECT id FROM latest)
        RETURNING id
      )
      INSERT INTO resume_history (resume_id, user_id, action)
      SELECT ${resumeId}, ${userId}, ${action}
      WHERE NOT EXISTS (SELECT 1 FROM merged)
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

/** Newest-first history for a resume. Callers must check access first.
 *  Avatar photos are fetched once per distinct user in a second query —
 *  joining photo_data_url here would ship the same base64 blob for every
 *  row of a prolific author (hundreds of copies per response). */
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

  const authorIds = [
    ...new Set(rows.map((row) => row.user_id).filter((id): id is string => id !== null)),
  ];
  const photos =
    authorIds.length > 0
      ? (await sql`
          SELECT id, photo_data_url FROM users WHERE id = ANY(${authorIds})
        `) as Array<{ id: string; photo_data_url: string | null }>
      : [];
  const photoByUserId = new Map(photos.map((p) => [p.id, p.photo_data_url]));

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
            avatar: avatarFromColumns(
              row.avatar_hue,
              row.avatar_expression,
              photoByUserId.get(row.user_id) ?? null,
            ),
          }
        : null,
  }));
}
