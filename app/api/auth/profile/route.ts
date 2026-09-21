import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";

/**
 * PATCH /api/auth/profile — update the logged-in user's display name.
 */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "You must be logged in." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { name } = body as { name?: string };
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (trimmed.length === 0 || trimmed.length > 100) {
    return NextResponse.json(
      { error: "Enter a name between 1 and 100 characters." },
      { status: 400 },
    );
  }

  await sql`UPDATE users SET name = ${trimmed} WHERE id = ${user.id}`;
  return NextResponse.json({ name: trimmed });
}
