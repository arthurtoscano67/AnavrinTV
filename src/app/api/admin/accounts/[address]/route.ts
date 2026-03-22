import { NextRequest, NextResponse } from "next/server";

import { updateAccountModeration } from "@/lib/db";
import { normalizeAddress, requireAdmin } from "@/lib/request-auth";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const adminCheck = requireAdmin(request);
  if (!adminCheck.ok) return adminCheck.response;

  const { address } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    banned?: boolean;
    bannedReason?: string | null;
    bannedUntil?: string | null;
    treasuryFeeBps?: number;
    moderationNotes?: string | null;
  };

  const normalizedAddress = normalizeAddress(address);
  if (!normalizedAddress) {
    return NextResponse.json({ error: "Account address is required." }, { status: 400 });
  }

  const account = await updateAccountModeration({
    address: normalizedAddress,
    banned: body.banned,
    bannedReason: body.bannedReason,
    bannedUntil: body.bannedUntil,
    bannedBy: adminCheck.adminAddress,
    treasuryFeeBps: body.treasuryFeeBps,
    moderationNotes: body.moderationNotes,
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  return NextResponse.json({ account });
}
