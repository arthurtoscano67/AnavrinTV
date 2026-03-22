type ProfileHeaderProps = {
  bannerFrom: string;
  bannerVia: string;
  bannerTo: string;
  bannerUrl?: string;
  avatarLabel: string;
  avatarUrl?: string;
  displayName: string;
  handle: string;
  bio: string;
  verified?: boolean;
  walletBadge?: string;
  isOwner?: boolean;
  isFollowing?: boolean;
  onEditProfile?: () => void;
  onToggleFollow?: () => void;
};

export function ProfileHeader({
  bannerFrom,
  bannerVia,
  bannerTo,
  bannerUrl,
  avatarLabel,
  avatarUrl,
  displayName,
  handle,
  bio,
  verified = false,
  walletBadge,
  isOwner = false,
  isFollowing = false,
  onEditProfile,
  onToggleFollow,
}: ProfileHeaderProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a]">
      <div
        className="h-40 w-full md:h-48"
        style={{
          background: `linear-gradient(135deg, ${bannerFrom} 0%, ${bannerVia} 58%, ${bannerTo} 100%)`,
        }}
      >
        {bannerUrl ? (
          <img
            alt={`${displayName} banner`}
            className="size-full object-cover"
            draggable={false}
            src={bannerUrl}
          />
        ) : null}
      </div>

      <div className="px-4 pb-4 md:px-6 md:pb-6">
        <div className="-mt-12 flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="size-24 shrink-0 overflow-hidden rounded-full border-4 border-[#1a1a1a] bg-[#272727] md:size-28">
              {avatarUrl ? (
                <img
                  alt={displayName}
                  className="size-full object-cover"
                  draggable={false}
                  src={avatarUrl}
                />
              ) : (
                <div className="grid size-full place-items-center text-2xl font-semibold text-white">
                  {avatarLabel}
                </div>
              )}
            </div>

            <div className="min-w-0 pt-13 md:pt-14">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-semibold text-white md:text-2xl">{displayName}</h1>
                {verified ? (
                  <span className="rounded-full border border-cyan-300/30 bg-cyan-300/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                    Verified
                  </span>
                ) : null}
                {walletBadge ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                    {walletBadge}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-slate-400">{handle}</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">{bio}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOwner ? (
              <button
                className="btn-secondary px-4 py-2.5 text-xs uppercase tracking-[0.2em]"
                onClick={onEditProfile}
                type="button"
              >
                Edit profile
              </button>
            ) : (
              <>
                <button className="btn-secondary px-4 py-2.5 text-xs uppercase tracking-[0.2em]" type="button">
                  Message
                </button>
                <button
                  className="btn-primary px-4 py-2.5 text-xs uppercase tracking-[0.2em]"
                  onClick={onToggleFollow}
                  type="button"
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
