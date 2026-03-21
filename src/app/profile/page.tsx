import { normalizeUsernameInput } from "@/lib/creator-identity";
import { loadDb } from "@/lib/db";
import { ProfileResolverClient } from "@/components/profile/profile-resolver-client";

export default async function ProfileResolverPage() {
  const db = await loadDb();
  const addressToUsername: Record<string, string> = {};
  const knownUsernames: string[] = [];

  for (const account of db.accounts) {
    const normalizedAddress = account.address.trim().toLowerCase();
    const normalizedUsername = normalizeUsernameInput(account.username || account.handle);
    if (!normalizedAddress || !normalizedUsername) continue;

    addressToUsername[normalizedAddress] = normalizedUsername;
    knownUsernames.push(normalizedUsername);
  }

  for (const video of db.videos) {
    const normalizedUsername = normalizeUsernameInput(video.creatorUsername);
    if (!normalizedUsername) continue;
    knownUsernames.push(normalizedUsername);
  }

  return (
    <ProfileResolverClient
      addressToUsername={addressToUsername}
      knownUsernames={[...new Set(knownUsernames)]}
    />
  );
}
