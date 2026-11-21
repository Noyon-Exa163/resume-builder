import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { avatarFromColumns } from "@/lib/avatar";

/**
 * GET /api/users — every other user in the system, for the resume Share
 * dialog's people list. Any authenticated user may call this (unlike
 * /api/admin/users, which is admin-only and returns richer fields).
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = (await sql`
    SELECT id, email, name, avatar_hue, avatar_expression, photo_data_url
    FROM users WHERE id != ${user.id} ORDER BY email ASC
  `) as Array<{
    id: string;
    email: string;
    name: string | null;
    avatar_hue: number | null;
    avatar_expression: string | null;
    photo_data_url: string | null;
  }>;

  return NextResponse.json(
    rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name?.trim() || row.email.split("@")[0],
      avatar: avatarFromColumns(
        row.avatar_hue,
        row.avatar_expression,
        row.photo_data_url,
      ),
    })),
  );
}
