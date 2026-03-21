import { NextRequest, NextResponse } from "next/server";

import { loadDb } from "@/lib/db";
import { normalizeUsernameInput, validateUsername } from "@/lib/creator-identity";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const usernameParam = request.nextUrl.searchParams.get("username") ?? "";
  const excludeAddress = request.nextUrl.searchParams.get("excludeAddress")?.trim().toLowerCase() ?? "";
  const normalized = normalizeUsernameInput(usernameParam);
  const validationError = validateUsername(usernameParam);

  if (validationError) {
    return NextResponse.json(
      {
        username: normalized,
        available: false,
        reason: validationError,
      },
      { status: 200 },
    );
  }

  const db = await loadDb();
  const taken = db.accounts.some(
    (account) =>
      account.address.toLowerCase() !== excludeAddress &&
      normalizeUsernameInput(account.username || account.handle) === normalized,
  );

  return NextResponse.json({
    username: normalized,
    available: !taken,
    reason: taken ? "Username is unavailable" : null,
  });
}
