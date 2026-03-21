import { NextRequest, NextResponse } from "next/server";

import { updateAccountProfile } from "@/lib/db";
import type { WalletMode } from "@/lib/types";

export const runtime = "nodejs";

function parseWalletMode(value: string | null): WalletMode | undefined {
  if (value === "wallet" || value === "slush" || value === "zklogin" || value === "guest") {
    return value;
  }
  return undefined;
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    address?: string;
    displayName?: string;
    handle?: string;
    bio?: string;
    avatarUrl?: string;
    mode?: string;
  };

  if (!body.address) {
    return NextResponse.json({ error: "Wallet address is required." }, { status: 400 });
  }

  const account = await updateAccountProfile(body.address, {
    displayName: body.displayName,
    handle: body.handle,
    bio: body.bio,
    avatarUrl: body.avatarUrl,
    mode: parseWalletMode(body.mode ?? null),
  });

  return NextResponse.json({ account });
}
