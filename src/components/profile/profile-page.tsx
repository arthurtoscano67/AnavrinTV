"use client";

import { useMemo, useState } from "react";

import { AboutPanel } from "@/components/profile/about-panel";
import { ContentGrid } from "@/components/profile/content-grid";
import type { ProfileContentItem } from "@/components/profile/content-card";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileStats } from "@/components/profile/profile-stats";
import { ProfileTabs, type ProfileTab } from "@/components/profile/profile-tabs";

export type ProfilePageData = {
  bannerFrom: string;
  bannerVia: string;
  bannerTo: string;
  avatarLabel: string;
  displayName: string;
  handle: string;
  bio: string;
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

const tabs: ProfileTab[] = ["Videos", "Blobs", "Playlists", "About"];

type ProfilePageProps = {
  data: ProfilePageData;
};

export function ProfilePage({ data }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("Videos");

  const tabItems = useMemo(() => {
    switch (activeTab) {
      case "Videos":
        return data.videos;
      case "Blobs":
        return data.blobs;
      case "Playlists":
        return data.playlists;
      case "About":
        return [];
    }
  }, [activeTab, data.blobs, data.playlists, data.videos]);

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-3">
      <ProfileHeader
        avatarLabel={data.avatarLabel}
        bannerFrom={data.bannerFrom}
        bannerTo={data.bannerTo}
        bannerVia={data.bannerVia}
        bio={data.bio}
        displayName={data.displayName}
        handle={data.handle}
        verified={data.verified}
        walletBadge={data.walletBadge}
      />

      <ProfileStats
        followers={data.stats.followers}
        following={data.stats.following}
        totalBlobs={data.stats.totalBlobs}
        totalVideos={data.stats.totalVideos}
        totalViews={data.stats.totalViews}
      />

      <ProfileTabs activeTab={activeTab} onChange={setActiveTab} tabs={tabs} />

      {activeTab === "About" ? (
        <AboutPanel
          bio={data.bio}
          joinedDate={data.about.joinedDate}
          links={data.about.links}
          socials={data.about.socials}
          walletAddress={data.about.walletAddress}
        />
      ) : (
        <ContentGrid
          emptyLabel={`No ${activeTab.toLowerCase()} published yet.`}
          items={tabItems}
        />
      )}
    </div>
  );
}
