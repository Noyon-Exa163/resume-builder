import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { sql } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import {
  isAvatarExpressionKey,
  isAvatarHue,
  isAvatarPhotoDataUrl,
} from "@/lib/avatar";

/**
 * PATCH /api/auth/profile — update the logged-in user's profile. Accepts
 * `name` and/or `avatar: { hue, expression, photoDataUrl }` (each null to
 * reset; photoDataUrl null clears an uploaded photo so the generated avatar
 * shows again); omitted fields are left untouched.
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

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { name, avatar } = body as {
    name?: unknown;
    avatar?: {
      hue?: unknown;
      expression?: unknown;
      photoDataUrl?: unknown;
    } | null;
  };

  // Validate everything before writing so a bad field can't leave a
  // half-applied update behind.
  let trimmedName: string | undefined;
  if (name !== undefined) {
    trimmedName = typeof name === "string" ? name.trim() : "";
    if (trimmedName.length === 0 || trimmedName.length > 100) {
      return NextResponse.json(
        { error: "Enter a name between 1 and 100 characters." },
        { status: 400 },
      );
    }
  }

  const hue = avatar?.hue ?? null;
  const expression = avatar?.expression ?? null;
  if (
    avatar !== undefined &&
    ((hue !== null && !isAvatarHue(hue)) ||
      (expression !== null && !isAvatarExpressionKey(expression)))
  ) {
    return NextResponse.json(
      { error: "Choose a valid avatar color and expression." },
      { status: 400 },
    );
  }

  // Uploaded photo: null clears it (generated avatar shows again), a valid
  // data-URL string sets it, undefined leaves the stored photo untouched.
  if (
    avatar != null &&
    avatar.photoDataUrl !== undefined &&
    avatar.photoDataUrl !== null &&
    !isAvatarPhotoDataUrl(avatar.photoDataUrl)
  ) {
    return NextResponse.json(
      { error: "Choose a JPG, PNG, or WebP image under 150 KB." },
      { status: 400 },
    );
  }

  if (trimmedName !== undefined) {
    await sql`UPDATE users SET name = ${trimmedName} WHERE id = ${user.id}`;
  }
  if (avatar != null) {
    if (avatar.photoDataUrl === undefined) {
      await sql`
        UPDATE users
        SET avatar_hue = ${hue}, avatar_expression = ${expression}
        WHERE id = ${user.id}
      `;
    } else {
      await sql`
        UPDATE users
        SET avatar_hue = ${hue}, avatar_expression = ${expression},
          photo_data_url = ${avatar.photoDataUrl}
        WHERE id = ${user.id}
      `;
    }
  }

  // Name/avatar changes surface in the cached admin users list.
  revalidateTag("users", { expire: 0 });
  return NextResponse.json({ ok: true });
}
