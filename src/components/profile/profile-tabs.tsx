"use client";

export type ProfileTab = "Videos" | "Blobs" | "Playlists" | "About";

type ProfileTabsProps = {
  tabs: ProfileTab[];
  activeTab: ProfileTab;
  onChange: (tab: ProfileTab) => void;
};

export function ProfileTabs({ tabs, activeTab, onChange }: ProfileTabsProps) {
  return (
    <section className="overflow-x-auto">
      <div className="inline-flex min-w-full gap-2 rounded-xl border border-white/10 bg-[#0b1120] p-2">
        {tabs.map((tab) => {
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              className={[
                "rounded-full px-4 py-2 text-sm font-medium transition whitespace-nowrap",
                active
                  ? "border border-cyan-300/30 bg-cyan-300/12 text-cyan-100"
                  : "border border-transparent text-slate-300 hover:bg-white/8 hover:text-white",
              ].join(" ")}
              onClick={() => onChange(tab)}
              type="button"
            >
              {tab}
            </button>
          );
        })}
      </div>
    </section>
  );
}
