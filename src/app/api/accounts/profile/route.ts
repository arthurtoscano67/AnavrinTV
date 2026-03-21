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
    username?: string;
    handle?: string;
    bio?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    mode?: string;
  };

  if (!body.address) {
    return NextResponse.json({ error: "Wallet address is required." }, { status: 400 });
  }

  try {
    const account = await updateAccountProfile(body.address, {
      displayName: body.displayName,
      username: body.username,
      handle: body.handle,
      bio: body.bio,
      avatarUrl: body.avatarUrl,
      bannerUrl: body.bannerUrl,
      mode: parseWalletMode(body.mode ?? null),
    });

    return NextResponse.json({ account });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update profile.";
    const status = message.toLowerCase().includes("taken") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
