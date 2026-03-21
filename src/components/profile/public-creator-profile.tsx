import { AboutPanel } from "@/components/profile/about-panel";
import { ContentGrid } from "@/components/profile/content-grid";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileStats } from "@/components/profile/profile-stats";
import { ProfileTabs, type ProfileTab } from "@/components/profile/profile-tabs";
import type { ProfilePageData } from "@/components/profile/profile-page";

type PublicCreatorProfileProps = {
  data: ProfilePageData;
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  isOwner: boolean;
  isFollowing: boolean;
  onEditProfile: () => void;
  onToggleFollow: () => void;
};

export function PublicCreatorProfile({
  data,
  activeTab,
  onTabChange,
  isOwner,
  isFollowing,
  onEditProfile,
  onToggleFollow,
}: PublicCreatorProfileProps) {
  const tabItems =
    activeTab === "Videos"
      ? data.videos
      : activeTab === "Blobs"
        ? data.blobs
        : activeTab === "Playlists"
          ? data.playlists
          : [];

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-3">
      <ProfileHeader
        avatarLabel={data.avatarLabel}
        avatarUrl={data.avatarUrl}
        bannerFrom={data.bannerFrom}
        bannerTo={data.bannerTo}
        bannerUrl={data.bannerUrl}
        bannerVia={data.bannerVia}
        bio={data.bio}
        displayName={data.displayName}
        handle={data.handle}
        isFollowing={isFollowing}
        isOwner={isOwner}
        onEditProfile={onEditProfile}
        onToggleFollow={onToggleFollow}
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

      <ProfileTabs activeTab={activeTab} onChange={onTabChange} tabs={["Videos", "Blobs", "Playlists", "About"]} />

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
