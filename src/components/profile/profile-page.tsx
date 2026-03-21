"use client";

import { useState } from "react";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCurrentAccount } from "@mysten/dapp-kit-react";

import { formatHandle } from "@/lib/creator-identity";
import type { WalletSession } from "@/lib/types";
import type { ProfileContentItem } from "@/components/profile/content-card";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";
import { PublicCreatorProfile } from "@/components/profile/public-creator-profile";
import type { ProfileTab } from "@/components/profile/profile-tabs";

export type ProfilePageData = {
  id: string;
  address: string;
  displayName: string;
  username: string;
  handle: string;
  bio: string;
  avatarLabel: string;
  avatarUrl?: string;
  bannerFrom: string;
  bannerVia: string;
  bannerTo: string;
  bannerUrl?: string;
  verified: boolean;
  walletBadge?: string;
  stats: {
    followers: number;
    following: number;
    totalVideos: number;
    totalBlobs: number;
    totalViews: number;
  };
  about: {
    joinedDate: string;
    walletAddress: string;
    links: Array<{ label: string; href: string }>;
    socials: Array<{ label: string; href: string }>;
  };
  videos: ProfileContentItem[];
  blobs: ProfileContentItem[];
  playlists: ProfileContentItem[];
};

type ProfilePageProps = {
  data: ProfilePageData;
};

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AT";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function ProfilePage({ data }: ProfilePageProps) {
  const account = useCurrentAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<ProfileTab>("Videos");
  const [openEdit, setOpenEdit] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfilePageData>(data);

  const isOwner =
    Boolean(account?.address) &&
    account?.address.toLowerCase() === profile.address.toLowerCase();
  const urlToast = searchParams.get("updated") === "1" ? "Profile updated" : null;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function handleProfileSaved(updatedAccount: WalletSession) {
    setProfile((current) => {
      const next = {
        ...current,
        displayName: updatedAccount.displayName,
        username: updatedAccount.username,
        handle: formatHandle(updatedAccount.username),
        bio: updatedAccount.bio?.trim() || current.bio,
        avatarLabel: initials(updatedAccount.displayName),
        avatarUrl: updatedAccount.avatarUrl,
        bannerUrl: updatedAccount.bannerUrl,
        walletBadge: current.walletBadge,
        stats: {
          followers:
            updatedAccount.followersCount ??
            updatedAccount.followers ??
            current.stats.followers,
          following:
            updatedAccount.followingCount ??
            updatedAccount.following ??
            current.stats.following,
          totalVideos: updatedAccount.totalVideos ?? current.stats.totalVideos,
          totalBlobs: updatedAccount.totalBlobs ?? current.stats.totalBlobs,
          totalViews: updatedAccount.totalViews ?? current.stats.totalViews,
        },
      } satisfies ProfilePageData;

      if (current.username !== updatedAccount.username) {
        router.replace(`/profile/${updatedAccount.username}?updated=1`);
      } else {
        setToast("Profile updated");
      }

      return next;
    });
  }

  return (
    <>
      <PublicCreatorProfile
        activeTab={activeTab}
        data={profile}
        isFollowing={isFollowing}
        isOwner={isOwner}
        onEditProfile={() => setOpenEdit(true)}
        onTabChange={setActiveTab}
        onToggleFollow={() => setIsFollowing((value) => !value)}
      />

      <EditProfileModal
        address={profile.address}
        initialValues={{
          displayName: profile.displayName,
          username: profile.username,
          bio: profile.bio,
          avatarUrl: profile.avatarUrl,
          bannerUrl: profile.bannerUrl,
        }}
        onClose={() => setOpenEdit(false)}
        onSaved={handleProfileSaved}
        open={openEdit && isOwner}
      />

      {toast ? (
        <div className="fixed right-4 top-20 z-[95] rounded-xl border border-emerald-300/25 bg-emerald-300/15 px-3 py-2 text-sm text-emerald-100 shadow-[0_14px_30px_rgba(0,0,0,0.35)]">
          {toast}
        </div>
      ) : urlToast ? (
        <div className="fixed right-4 top-20 z-[95] rounded-xl border border-emerald-300/25 bg-emerald-300/15 px-3 py-2 text-sm text-emerald-100 shadow-[0_14px_30px_rgba(0,0,0,0.35)]">
          {urlToast}
        </div>
      ) : null}
    </>
  );
}
