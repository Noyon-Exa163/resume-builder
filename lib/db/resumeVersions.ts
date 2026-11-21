import { avatarFromColumns } from "@/lib/avatar";
import { sql } from "@/lib/db/client";
import type { ResumeHistoryUser } from "@/lib/db/resumeHistory";
import type { ResumeData } from "@/lib/schema/resume";

export interface ResumeVersionEntry {
  id: string;
  /** Per-resume counter; the title is "V{number}". */
  number: number;
  /** When the version's author last changed the resume. */
  savedAt: string;
  /** null when the author's account has since been deleted. */
  user: ResumeHistoryUser | null;
}

/** A person's changes become a version after this long with no further saves by them. */
const VERSION_IDLE_MINUTES = 30;

/** Versions kept per resume; older ones are deleted as new ones arrive. */
const VERSION_LIMIT = 5;

/**
 * Turns every save that has been idle long enough into a version. There is
 * no background job: this runs whenever a resume is saved or its versions are
 * read, and dates each version by the author's last save, so the result is
 * the same whenever it happens to run. Each pending row is claimed by a
 * single DELETE ... RETURNING, so concurrent callers can't create it twice,
 * and the claim + prune run in one transaction so the prune can never drop
 * rows a concurrent caller just inserted.
 *
 * The common case — no countdown has expired — exits after one cheap read
 * instead of opening a write transaction; that keeps versions GETs read-only
 * in the steady state.
 */
async function materializeDueVersions(resumeId: string): Promise<void> {
  const due = (await sql`
    SELECT 1 FROM resume_version_pending
    WHERE resume_id = ${resumeId}::text
      AND last_saved_at <= now() - make_interval(mins => ${VERSION_IDLE_MINUTES})
    LIMIT 1
  `) as Array<unknown>;
  if (due.length === 0) return;

  await sql.begin(async (tx) => {
    await tx`
      WITH due AS (
        DELETE FROM resume_version_pending
        WHERE resume_id = ${resumeId}::text
          AND last_saved_at <= now() - make_interval(mins => ${VERSION_IDLE_MINUTES})
        RETURNING user_id, snapshot, last_saved_at
      ),
      base AS (
        SELECT COALESCE(MAX(number), 0) AS n
        FROM resume_versions WHERE resume_id = ${resumeId}::text
      )
      INSERT INTO resume_versions (resume_id, number, user_id, snapshot, created_at)
      SELECT ${resumeId}::text, base.n + ROW_NUMBER() OVER (ORDER BY due.last_saved_at),
        due.user_id, due.snapshot, due.last_saved_at
      FROM due CROSS JOIN base
    `;
    await tx`
      DELETE FROM resume_versions
      WHERE resume_id = ${resumeId}::text
        AND number <= (
          SELECT MAX(number) FROM resume_versions WHERE resume_id = ${resumeId}::text
        ) - ${VERSION_LIMIT}
    `;
  });
}

/**
 * Notes that `userId` just saved `resumeId` with this content, which
 * restarts that person's 30 minute countdown. Anything already due is turned
 * into a version first, so a stale countdown of theirs isn't overwritten.
 * Never throws: versions are secondary and must not fail the save.
 */
export async function recordVersionActivity(
  resumeId: string,
  userId: string,
  snapshot: ResumeData,
): Promise<void> {
  try {
    await materializeDueVersions(resumeId);
    await sql`
      INSERT INTO resume_version_pending (resume_id, user_id, snapshot, last_saved_at)
      VALUES (${resumeId}, ${userId}, ${snapshot}::jsonb, now())
      ON CONFLICT (resume_id, user_id)
      DO UPDATE SET snapshot = EXCLUDED.snapshot, last_saved_at = now()
    `;
  } catch (error) {
    console.error("Failed to record resume version activity:", error);
  }
}

interface VersionRow {
  id: string;
  number: number;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  avatar_hue: number | null;
  avatar_expression: string | null;
  photo_data_url: string | null;
}

/** Newest-first versions for a resume. Callers must check access first. */
export async function listResumeVersions(
  resumeId: string,
): Promise<ResumeVersionEntry[]> {
  await materializeDueVersions(resumeId);

  const rows = (await sql`
    SELECT v.id, v.number, v.created_at, v.user_id,
      u.email AS user_email, u.name AS user_name,
      u.avatar_hue, u.avatar_expression, u.photo_data_url
    FROM resume_versions v
    LEFT JOIN users u ON u.id = v.user_id
    WHERE v.resume_id = ${resumeId}
    ORDER BY v.number DESC
    LIMIT ${VERSION_LIMIT}
  `) as VersionRow[];

  return rows.map((row) => ({
    id: String(row.id),
    number: row.number,
    savedAt: new Date(row.created_at).toISOString(),
    user:
      row.user_id && row.user_email
        ? {
            id: row.user_id,
            name: row.user_name?.trim() || row.user_email.split("@")[0],
            email: row.user_email,
            avatar: avatarFromColumns(
              row.avatar_hue,
              row.avatar_expression,
              row.photo_data_url,
            ),
          }
        : null,
  }));
}

/**
 * The saved content of one version of `resumeId`, or null if there is no such
 * version (including one already pruned). Callers must check access first.
 */
export async function getResumeVersionSnapshot(
  resumeId: string,
  versionId: string,
): Promise<unknown | null> {
  const rows = (await sql`
    SELECT snapshot FROM resume_versions
    WHERE resume_id = ${resumeId} AND id = ${versionId}::bigint
  `) as Array<{ snapshot: unknown }>;
  return rows[0]?.snapshot ?? null;
}
